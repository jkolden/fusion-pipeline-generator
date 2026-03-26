BIP Pipeline Skeleton — pkg_bip_soap
=====================================

This package provides SOAP infrastructure for calling BI Publisher reports
and parsing the XML response. Individual load_* procedures are generated
by the Fusion Data Pipeline Generator and added to this package.

Prerequisites
-------------
1. Oracle APEX workspace on your database
2. APEX Web Credential (Basic Auth type) for BI Publisher access:
   - Go to APEX > Shared Components > Web Credentials
   - Create a credential with:
     - Static ID: e.g., 'BIP_CREDENTIAL'
     - Auth Type: Basic Authentication
     - Username/Password: Your Fusion service account

3. BI Publisher reports published to a shared catalog folder
   (e.g., /Custom/YourOrg/Reports/)

Setup
-----
1. Update the three constants in pkg_bip_soap.plb:
   - c_bip_url         => Your Fusion BIP SOAP endpoint URL
   - c_credential_id   => Your APEX Web Credential static ID
   - c_report_folder   => Default catalog folder path

2. Compile the spec first, then the body:
   @pkg_bip_soap.sql
   @pkg_bip_soap.plb

3. Use the Pipeline Generator (BIP mode) to generate load_* procedures.
   Copy each generated procedure into the package body before the
   final END statement, and add the spec declaration.

What's Included
---------------
- normalize_report_path() — resolves short names to full catalog paths
- parse_report_bytes()    — extracts base64 report data from SOAP response
- run_report_xml()        — full BIP SOAP call, returns parsed XMLTYPE
