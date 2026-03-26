create or replace package pkg_bicc_common as
-- =============================================================================
-- Shared utilities for BICC COPY_DATA pipeline.
-- Used by all entity packages (pkg_bicc_hcm_employee, pkg_bicc_ap_invoice, etc.)
--
-- SETUP: Update the two constants below to match your environment:
--   1. gc_credential  — DBMS_CLOUD credential name for OCI Object Storage
--   2. gc_bucket_uri  — Full Object Storage bucket URI
-- =============================================================================

    -- *** UPDATE THESE FOR YOUR ENVIRONMENT ***
    gc_credential constant varchar2(30)  := 'YOUR_OBJ_STORE_CREDENTIAL';
    gc_bucket_uri constant varchar2(200) := 'https://objectstorage.<region>.oraclecloud.com/n/<namespace>/b/<bucket>/o/';

    -- Type conversion (tolerant of bad data)
    function safe_to_number(p_str varchar2) return number;
    function safe_to_timestamp(p_str varchar2) return timestamp;

    -- Extract CSV from ZIP and upload to Object Storage staging location
    procedure extract_and_stage_csv(
        p_file_name    in varchar2,
        p_credential   in varchar2 default gc_credential,
        p_bucket_uri   in varchar2 default gc_bucket_uri,
        p_staging_name in varchar2
    );

    -- File management
    procedure refresh_bicc_files;

    procedure purge_bicc_objectstore(
        p_retention_days in number default 60
    );

    -- Housekeeping
    procedure purge_copy_tables;

    -- Orchestration (customize per project)
    procedure run_bicc_daily_today;

end pkg_bicc_common;
/
