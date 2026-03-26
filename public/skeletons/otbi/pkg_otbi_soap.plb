create or replace package body pkg_otbi_soap as
-- ============================================================================
-- OTBI SOAP Infrastructure Package — Body
--
-- No environment-specific constants needed. Credentials and instance URL
-- are passed as parameters to run_otbi_query and load_* procedures.
-- ============================================================================

    c_logon_action  constant varchar2(100) := '#logon';
    c_query_action  constant varchar2(100) := '#executeSQLQuery';
    c_content_type  constant varchar2(100) := 'text/xml; charset=UTF-8';


    -- -----------------------------------------------------------------------
    -- Private: parse session ID from SOAP logon response
    -- -----------------------------------------------------------------------
    function parse_session_id (
        p_response in clob
    ) return varchar2
    is
        l_xml        xmltype;
        l_session_id varchar2(200);
    begin
        l_xml := xmltype.createxml(substr(p_response, 40));

        select x.session_id
          into l_session_id
          from xmltable(
                   xmlnamespaces(
                       'http://schemas.xmlsoap.org/soap/envelope/' as "SOAP-ENV",
                       'urn://oracle.bi.webservices/v6'            as "sawsoap"
                   ),
                   'SOAP-ENV:Envelope/SOAP-ENV:Body/sawsoap:logonResult'
                   passing l_xml
                   columns session_id clob path '.'
               ) x;

        return l_session_id;
    end parse_session_id;


    -- -----------------------------------------------------------------------
    -- Private: get OTBI session via SOAP logon
    -- -----------------------------------------------------------------------
    function get_session (
        p_instance_url in varchar2,
        p_username     in varchar2,
        p_password     in varchar2
    ) return varchar2
    is
        l_envelope clob;
        l_response clob;
        l_url      varchar2(4000);
    begin
        l_url := p_instance_url || '/analytics-ws/saw.dll?SoapImpl=nQSessionService';

        l_envelope :=
              '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" '
           || 'xmlns:v6="urn://oracle.bi.webservices/v6">'
           || '<soapenv:Header/>'
           || '<soapenv:Body>'
           || '<v6:logon>'
           || '<v6:name>' || p_username || '</v6:name>'
           || '<v6:password>' || p_password || '</v6:password>'
           || '</v6:logon>'
           || '</soapenv:Body>'
           || '</soapenv:Envelope>';

        apex_web_service.clear_request_headers;
        apex_web_service.g_request_headers(1).name  := 'SOAPAction';
        apex_web_service.g_request_headers(1).value := c_logon_action;
        apex_web_service.g_request_headers(2).name  := 'Content-Type';
        apex_web_service.g_request_headers(2).value := c_content_type;

        l_response := apex_web_service.make_rest_request(
            p_url         => l_url,
            p_http_method => 'POST',
            p_body        => l_envelope
        );

        apex_web_service.clear_request_headers;

        if apex_web_service.g_status_code <> 200 then
            raise_application_error(
                -20010,
                'OTBI logon failed. HTTP status = ' || apex_web_service.g_status_code ||
                '. Response: ' || substr(l_response, 1, 2000)
            );
        end if;

        return parse_session_id(l_response);
    end get_session;


    -- -----------------------------------------------------------------------
    -- Private: execute OTBI logical SQL and return raw SOAP response
    -- -----------------------------------------------------------------------
    function execute_sql_query (
        p_instance_url in varchar2,
        p_session_id   in varchar2,
        p_logical_sql  in clob
    ) return clob
    is
        l_envelope clob;
        l_response clob;
        l_url      varchar2(4000);
    begin
        l_url := p_instance_url || '/analytics-ws/saw.dll?SoapImpl=xmlViewService';

        l_envelope :=
              '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" '
           || 'xmlns:v6="urn://oracle.bi.webservices/v6">'
           || '<soapenv:Header/>'
           || '<soapenv:Body>'
           || '<v6:executeSQLQuery>'
           || '<v6:sql>' || p_logical_sql || '</v6:sql>'
           || '<v6:outputFormat></v6:outputFormat>'
           || '<v6:executionOptions>'
           || '<v6:async></v6:async>'
           || '<v6:maxRowsPerPage></v6:maxRowsPerPage>'
           || '<v6:refresh>true</v6:refresh>'
           || '<v6:presentationInfo>false</v6:presentationInfo>'
           || '<v6:type></v6:type>'
           || '</v6:executionOptions>'
           || '<v6:sessionID>' || p_session_id || '</v6:sessionID>'
           || '</v6:executeSQLQuery>'
           || '</soapenv:Body>'
           || '</soapenv:Envelope>';

        apex_web_service.clear_request_headers;
        apex_web_service.g_request_headers(1).name  := 'SOAPAction';
        apex_web_service.g_request_headers(1).value := c_query_action;
        apex_web_service.g_request_headers(2).name  := 'Content-Type';
        apex_web_service.g_request_headers(2).value := c_content_type;

        l_response := apex_web_service.make_rest_request(
            p_url         => l_url,
            p_http_method => 'POST',
            p_body        => l_envelope
        );

        apex_web_service.clear_request_headers;

        if apex_web_service.g_status_code <> 200 then
            raise_application_error(
                -20011,
                'OTBI executeSQLQuery failed. HTTP status = ' || apex_web_service.g_status_code ||
                '. Response: ' || substr(l_response, 1, 2000)
            );
        end if;

        return l_response;
    end execute_sql_query;


    -- -----------------------------------------------------------------------
    -- Public: run_otbi_query — full pipeline: logon -> query -> parse XML
    -- Returns the parsed XMLTYPE ready for XMLTABLE consumption.
    -- -----------------------------------------------------------------------
    function run_otbi_query (
        p_logical_sql   in clob,
        p_username      in varchar2,
        p_password      in varchar2,
        p_instance_url  in varchar2
    ) return xmltype
    is
        l_session_id varchar2(200);
        l_response   clob;
        l_xml        xmltype;
    begin
        -- Step 1: Get session
        l_session_id := get_session(p_instance_url, p_username, p_password);

        -- Step 2: Execute query
        l_response := execute_sql_query(p_instance_url, l_session_id, p_logical_sql);

        -- Step 3: Parse — strip BOM/leading chars
        l_xml := xmltype.createxml(substr(l_response, 40));

        return l_xml;

    exception
        when others then
            apex_web_service.clear_request_headers;
            raise;
    end run_otbi_query;


    -- Generated load_* procedures go here (added by the pipeline generator tool)

end pkg_otbi_soap;
/
