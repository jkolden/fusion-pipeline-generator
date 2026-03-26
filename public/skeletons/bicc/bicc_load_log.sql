-- =============================================================================
-- BICC_LOAD_LOG — Audit trail for pipeline steps (stage, merge, purge, etc.)
-- =============================================================================
CREATE TABLE bicc_load_log (
    log_id      NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    load_type   VARCHAR2(50),
    step        VARCHAR2(100),
    rows_updated NUMBER,
    status      VARCHAR2(20),
    message     VARCHAR2(4000),
    created_ts  TIMESTAMP(6) DEFAULT SYSTIMESTAMP
);
