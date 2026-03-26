-- =============================================================================
-- BICC_LOAD_JOB — Tracks each load-and-preview / merge cycle
-- =============================================================================
CREATE TABLE bicc_load_job (
    job_id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    load_type       VARCHAR2(50)  NOT NULL,
    file_name       VARCHAR2(500) NOT NULL,
    status          VARCHAR2(20)  DEFAULT 'LOADING' NOT NULL,
    rows_loaded     NUMBER,
    new_count       NUMBER,
    changed_count   NUMBER,
    unchanged_count NUMBER,
    error_message   VARCHAR2(4000),
    loaded_by       VARCHAR2(200),
    loaded_ts       TIMESTAMP(6)  DEFAULT SYSTIMESTAMP,
    merged_by       VARCHAR2(200),
    merged_ts       TIMESTAMP(6),
    CONSTRAINT bicc_load_job_ck1
        CHECK (status IN ('LOADING','STAGED','LOADED','MERGED','ERROR'))
);

CREATE INDEX bicc_load_job_n1 ON bicc_load_job (load_type, status);
CREATE INDEX bicc_load_job_n2 ON bicc_load_job (file_name);
