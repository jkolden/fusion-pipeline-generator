-- =============================================================================
-- BICC_LOADER_MAP — Maps BICC ZIP file patterns to load types
-- =============================================================================
-- Each row tells the pipeline which load procedure to call for a given file.
-- FILE_LIKE uses SQL LIKE patterns (e.g., '%hcmemployee%').
-- PRIORITY controls matching order when a file could match multiple patterns.
-- =============================================================================
CREATE TABLE bicc_loader_map (
    map_id              NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    priority            NUMBER        NOT NULL,
    module_code         VARCHAR2(50),
    object_code         VARCHAR2(200),
    file_like           VARCHAR2(400),
    load_type           VARCHAR2(50)  NOT NULL,
    loader_available    VARCHAR2(1)   DEFAULT 'Y' NOT NULL,
    is_active           VARCHAR2(1)   DEFAULT 'Y' NOT NULL,
    CONSTRAINT bicc_loader_map_ck1 CHECK (loader_available IN ('Y','N')),
    CONSTRAINT bicc_loader_map_ck2 CHECK (is_active IN ('Y','N'))
);

CREATE INDEX bicc_loader_map_n1 ON bicc_loader_map (is_active, priority);
CREATE INDEX bicc_loader_map_n2 ON bicc_loader_map (module_code, object_code);
