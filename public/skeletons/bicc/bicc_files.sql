-- =============================================================================
-- BICC_FILES — Inventory of BICC ZIP files in Object Storage
-- =============================================================================
CREATE TABLE bicc_files (
    file_name       VARCHAR2(500) PRIMARY KEY,
    file_size       NUMBER,
    file_size_kb    NUMBER,
    last_modified   TIMESTAMP(6),
    module_code     VARCHAR2(100),
    object_code     VARCHAR2(100),
    load_type       VARCHAR2(200),
    loader_available VARCHAR2(1),
    refreshed_ts    TIMESTAMP(6) DEFAULT SYSTIMESTAMP,
    file_timestamp  TIMESTAMP(9)
);

-- =============================================================================
-- BICC_FILES_V — Discovers new ZIPs and maps them to load types
-- Requires: DBMS_CLOUD access, OCI credential, BICC_LOADER_MAP populated
-- =============================================================================
-- UPDATE the credential_name and location_uri for your environment
CREATE OR REPLACE VIEW bicc_files_v (file_name, load_type) AS
WITH o AS (
    SELECT regexp_substr(object_name, '[^/]+$') AS file_name
    FROM TABLE(
        dbms_cloud.list_objects(
            credential_name => 'YOUR_OBJ_STORE_CREDENTIAL',
            location_uri    => 'https://objectstorage.<region>.oraclecloud.com/n/<namespace>/b/<bucket>/o/'
        )
    )
    WHERE LOWER(object_name) LIKE '%.zip'
)
SELECT
    o.file_name,
    COALESCE(m.load_type, 'UNMAPPED') AS load_type
FROM o
OUTER APPLY (
    SELECT m1.load_type
    FROM bicc_loader_map m1
    WHERE m1.is_active = 'Y'
      AND m1.load_type IS NOT NULL
      AND m1.file_like IS NOT NULL
      AND LOWER(o.file_name) LIKE LOWER(m1.file_like)
    ORDER BY m1.priority
    FETCH FIRST 1 ROW ONLY
) m;
