create or replace package pkg_otbi_soap as
-- ============================================================================
-- OTBI SOAP Infrastructure Package
-- Provides session management and SOAP call helpers for OTBI logical SQL queries.
-- Individual load_* procedures are generated and added to this package.
-- ============================================================================

    -- Execute an OTBI logical SQL query and return the parsed XMLTYPE result.
    -- Handles session logon, SOAP envelope construction, and XML extraction.
    function run_otbi_query (
        p_logical_sql   in clob,
        p_username      in varchar2,
        p_password      in varchar2,
        p_instance_url  in varchar2
    ) return xmltype;

    -- Generated load_* procedures go here (added by the pipeline generator tool)

end pkg_otbi_soap;
/
