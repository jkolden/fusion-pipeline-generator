create or replace package body pkg_bip_soap as
-- ============================================================================
-- BIP SOAP Infrastructure Package — Body
--
-- SETUP: Update the three constants below to match your environment:
--   1. c_bip_url         — Your Fusion instance's BIP SOAP endpoint
--   2. c_credential_id   — APEX Web Credential static ID (Basic Auth)
--   3. c_report_folder   — Default BIP catalog folder for short report names
-- ============================================================================

    -- *** UPDATE THESE FOR YOUR ENVIRONMENT ***
    c_bip_url       constant varchar2(4000) :=
        'https://<your-instance>.fa.ocs.oraclecloud.com/xmlpserver/services/ExternalReportWSSService';

    c_credential_id constant varchar2(255) :=
        'YOUR_APEX_WEB_CREDENTIAL';

    c_report_folder constant varchar2(4000) :=
        '/Custom/Your/Reports';

    c_soap_action   constant varchar2(4000) :=
        'http://xmlns.oracle.com/oxp/service/PublicReportService';

    c_content_type  constant varchar2(200) :=
        'application/soap+xml; charset=UTF-8';


    function normalize_report_path (
        p_report_name in varchar2
    ) return varchar2
    is
        l_report_name varchar2(4000);
    begin
        l_report_name := trim(p_report_name);

        if instr(l_report_name, '/') > 0 then
            if lower(l_report_name) not like '%.xdo' then
                l_report_name := l_report_name || '.xdo';
            end if;
            return l_report_name;
        end if;

        if lower(l_report_name) not like '%.xdo' then
            l_report_name := l_report_name || '.xdo';
        end if;

        return c_report_folder || '/' || l_report_name;
    end normalize_report_path;


    function parse_report_bytes (
        p_soap_response in clob
    ) return clob
    is
        l_report_bytes clob;
    begin
        select x.report_bytes
          into l_report_bytes
          from xmltable(
                   xmlnamespaces(
                       'http://www.w3.org/2003/05/soap-envelope' as "soap",
                       'http://xmlns.oracle.com/oxp/service/PublicReportService' as "pub"
                   ),
                   '/soap:Envelope/soap:Body/pub:runReportResponse/pub:runReportReturn'
                   passing xmltype(p_soap_response)
                   columns
                       report_bytes clob path 'pub:reportBytes'
               ) x;

        return l_report_bytes;

    exception
        when no_data_found then
            return null;
    end parse_report_bytes;


    function run_report_xml (
        p_report_name   in varchar2,
        p_parameter_xml in clob default null
    ) return xmltype
    is
        l_report_path   varchar2(4000);
        l_soap_payload  clob;
        l_soap_response clob;
        l_base64        clob;
        l_blob          blob;
        l_xml           xmltype;
        l_status_code   number;
    begin
        l_report_path := normalize_report_path(p_report_name);

        l_soap_payload :=
              '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" '
           || 'xmlns:pub="http://xmlns.oracle.com/oxp/service/PublicReportService">'
           || '  <soap:Header/>'
           || '  <soap:Body>'
           || '    <pub:runReport>'
           || '      <pub:reportRequest>'
           || '        <pub:attributeFormat>xml</pub:attributeFormat>'
           || '        <pub:byPassCache>true</pub:byPassCache>'
           || '        <pub:flattenXML>true</pub:flattenXML>'
           || '        <pub:reportAbsolutePath>' || l_report_path || '</pub:reportAbsolutePath>'
           || '        <pub:sizeOfDataChunkDownload>-1</pub:sizeOfDataChunkDownload>'
           ||            nvl(p_parameter_xml, '')
           || '      </pub:reportRequest>'
           || '      <pub:appParams/>'
           || '    </pub:runReport>'
           || '  </soap:Body>'
           || '</soap:Envelope>';

        apex_web_service.clear_request_headers;

        apex_web_service.g_request_headers(1).name  := 'SOAPAction';
        apex_web_service.g_request_headers(1).value := c_soap_action;

        apex_web_service.g_request_headers(2).name  := 'Content-Type';
        apex_web_service.g_request_headers(2).value := c_content_type;

        l_soap_response := apex_web_service.make_rest_request(
            p_url                  => c_bip_url,
            p_http_method          => 'POST',
            p_body                 => l_soap_payload,
            p_credential_static_id => c_credential_id
        );

        l_status_code := apex_web_service.g_status_code;

        if l_status_code <> 200 then
            if l_soap_response like '%Data Model definition not found:%' then
                raise_application_error(
                    -20001,
                    'BIP report was found, but its internal data model reference is stale. ' ||
                    'Report path used: ' || l_report_path || '. Response: ' ||
                    substr(l_soap_response, 1, 2000)
                );
            else
                raise_application_error(
                    -20002,
                    'BIP SOAP call failed. HTTP status = ' || l_status_code ||
                    '. Report path used: ' || l_report_path ||
                    '. Response: ' || substr(l_soap_response, 1, 2000)
                );
            end if;
        end if;

        l_base64 := parse_report_bytes(l_soap_response);

        if l_base64 is null then
            raise_application_error(
                -20003,
                'No reportBytes found in SOAP response for report path ' || l_report_path
            );
        end if;

        l_blob := apex_web_service.clobbase642blob(l_base64);

        if l_blob is null then
            raise_application_error(
                -20004,
                'Unable to decode reportBytes for report path ' || l_report_path
            );
        end if;

        l_xml := xmltype(l_blob, 873); -- AL32UTF8

        if dbms_lob.istemporary(l_blob) = 1 then
            dbms_lob.freetemporary(l_blob);
        end if;

        apex_web_service.clear_request_headers;

        return l_xml;

    exception
        when others then
            apex_web_service.clear_request_headers;

            if l_blob is not null and dbms_lob.istemporary(l_blob) = 1 then
                dbms_lob.freetemporary(l_blob);
            end if;

            raise;
    end run_report_xml;


    -- Generated load_* procedures go here (added by the pipeline generator tool)

end pkg_bip_soap;
/
