create or replace package body pkg_bicc_common as

    -- =========================================================================
    -- SAFE TYPE CONVERSIONS
    -- =========================================================================

    function safe_to_number(p_str varchar2) return number is
    begin
        if p_str is null or trim(p_str) is null then
            return null;
        end if;
        return to_number(trim(p_str));
    exception
        when others then
            return null;
    end safe_to_number;

    function safe_to_timestamp(p_str varchar2) return timestamp is
        v varchar2(200) := trim(p_str);
    begin
        if v is null then
            return null;
        end if;

        -- 6/14/2025
        if regexp_like(v, '^\d{1,2}/\d{1,2}/\d{4}$') then
            return to_timestamp(v, 'MM/DD/YYYY');
        end if;

        -- 2025-06-14
        if regexp_like(v, '^\d{4}-\d{2}-\d{2}$') then
            return to_timestamp(v, 'YYYY-MM-DD');
        end if;

        -- 2025-06-14 12:30:44.123
        if regexp_like(v, '^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(\.\d+)?$') then
            return to_timestamp(v, 'YYYY-MM-DD HH24:MI:SS.FF');
        end if;

        -- 2025-06-14T12:30:44.123Z (or without Z)
        if instr(v, 'T') > 0 then
            v := replace(v, 'T', ' ');
            v := rtrim(v, 'Z');
            if regexp_like(v, '^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(\.\d+)?$') then
                return to_timestamp(v, 'YYYY-MM-DD HH24:MI:SS.FF');
            end if;
        end if;

        return null;
    exception
        when others then
            return null;
    end safe_to_timestamp;

    -- =========================================================================
    -- EXTRACT CSV FROM ZIP AND UPLOAD TO OBJECT STORAGE
    -- =========================================================================

    procedure extract_and_stage_csv(
        p_file_name    in varchar2,
        p_credential   in varchar2 default gc_credential,
        p_bucket_uri   in varchar2 default gc_bucket_uri,
        p_staging_name in varchar2
    ) is
        l_zip_blob  blob;
        l_csv_blob  blob;
        l_file_list apex_zip.t_files;
        l_csv_name  varchar2(32767);
    begin
        -- Download ZIP from Object Storage
        l_zip_blob := dbms_cloud.get_object(
            credential_name => p_credential,
            object_uri      => p_bucket_uri || p_file_name
        );

        -- Find first CSV in the ZIP
        l_file_list := apex_zip.get_files(p_zipped_blob => l_zip_blob);
        for i in 1 .. l_file_list.count loop
            if lower(l_file_list(i)) like '%.csv' then
                l_csv_name := l_file_list(i);
                exit;
            end if;
        end loop;
        if l_csv_name is null then
            l_csv_name := l_file_list(1);
        end if;

        -- Extract CSV content
        l_csv_blob := apex_zip.get_file_content(
            p_zipped_blob => l_zip_blob,
            p_file_name   => l_csv_name
        );

        -- Upload CSV to staging location so COPY_DATA can read it
        dbms_cloud.put_object(
            credential_name => p_credential,
            object_uri      => p_bucket_uri || p_staging_name,
            contents        => l_csv_blob
        );
    end extract_and_stage_csv;


    -- =========================================================================
    -- REFRESH FILE LIST
    -- =========================================================================

    procedure refresh_bicc_files is
    begin
        merge into bicc_files t
        using (
            select file_name, load_type
            from bicc_files_v
        ) s
        on (t.file_name = s.file_name)

        when matched then update set
            t.load_type    = s.load_type,
            t.refreshed_ts = systimestamp

        when not matched then insert (
            file_name,
            load_type,
            refreshed_ts
        ) values (
            s.file_name,
            s.load_type,
            systimestamp
        );
    end refresh_bicc_files;


    -- =========================================================================
    -- PURGE OLD FILES FROM OBJECT STORAGE
    -- =========================================================================

    procedure purge_bicc_objectstore(
        p_retention_days in number default 60
    ) is
        l_cutoff   timestamp := systimestamp - numtodsinterval(p_retention_days, 'DAY');
        l_ts_text  varchar2(32);
        l_file_ts  timestamp;
    begin
        for r in (
            select object_name
            from table(dbms_cloud.list_objects(
                credential_name => gc_credential,
                location_uri    => gc_bucket_uri
            ))
            where object_name like '%.zip'
        )
        loop
            l_ts_text := regexp_substr(r.object_name, '-(\d{8}_\d{6})\.zip', 1, 1, 'i', 1);

            if l_ts_text is not null then
                l_file_ts := to_timestamp(l_ts_text, 'YYYYMMDD_HH24MISS');

                if l_file_ts < l_cutoff then
                    dbms_cloud.delete_object(
                        credential_name => gc_credential,
                        object_uri      => gc_bucket_uri || r.object_name
                    );
                end if;
            end if;
        end loop;
    end purge_bicc_objectstore;


    -- =========================================================================
    -- PURGE COPY$ HOUSEKEEPING TABLES
    -- =========================================================================

    procedure purge_copy_tables is
    begin
        for r in (
            select table_name
              from user_tables
             where table_name like 'COPY$%'
        ) loop
            execute immediate 'DROP TABLE "' || r.table_name || '" PURGE';
        end loop;
    end purge_copy_tables;


    -- =========================================================================
    -- DAILY BICC LOAD ORCHESTRATION
    -- =========================================================================
    -- TODO: Customize this for your project.
    -- Add CASE statements for each entity's load_and_preview / merge calls.
    -- See the generator output's "common patches" file for the code snippets.
    -- =========================================================================

    procedure run_bicc_daily_today is
    begin
        -- 1) Refresh the file list
        refresh_bicc_files;

        -- 2) For each load_type, pick the latest file from today,
        --    call pkg_bicc_<entity>.load_and_preview then .merge
        --    Add your entity CASE statements here.
        null; -- placeholder

        -- 3) Clean up COPY$ housekeeping tables
        purge_copy_tables;
    end run_bicc_daily_today;

end pkg_bicc_common;
/
