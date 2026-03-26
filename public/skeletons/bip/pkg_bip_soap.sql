create or replace package pkg_bip_soap as
-- ============================================================================
-- BIP SOAP Infrastructure Package
-- Provides SOAP call helpers for BI Publisher report execution.
-- Individual load_* procedures are generated and added to this package.
-- ============================================================================

    function run_report_xml (
        p_report_name   in varchar2,
        p_parameter_xml in clob default null
    ) return xmltype;

    -- Generated load_* procedures go here (added by the pipeline generator tool)

end pkg_bip_soap;
/
