// ============================================================
// Per-Technique Mitigations, Data Sources & Sigma Guidance
// Source: MITRE ATT&CK Enterprise v15 Mitigations + Data Sources
// ============================================================

// MITRE Mitigations reference
export const MITIGATIONS = {
  M1049: { id: 'M1049', name: 'Antivirus/Antimalware', desc: 'Deploy up-to-date anti-malware with behavioral and heuristic detection.' },
  M1048: { id: 'M1048', name: 'Application Isolation and Sandboxing', desc: 'Isolate high-risk applications (browsers, email clients) via sandboxing.' },
  M1047: { id: 'M1047', name: 'Audit', desc: 'Regularly audit configurations, permissions and accounts.' },
  M1040: { id: 'M1040', name: 'Behavior Prevention on Endpoint', desc: 'Use behavioral EDR rules to block suspicious actions.' },
  M1038: { id: 'M1038', name: 'Execution Prevention', desc: 'Application whitelisting — only allow approved executables.' },
  M1037: { id: 'M1037', name: 'Filter Network Traffic', desc: 'Network filtering (NGFW, proxy, IPS) to block malicious traffic.' },
  M1036: { id: 'M1036', name: 'Account Use Policies', desc: 'Account lockout, rotation and password complexity policies.' },
  M1035: { id: 'M1035', name: 'Limit Access to Resource Over Network', desc: 'Restrict network access to sensitive resources (micro-segmentation).' },
  M1034: { id: 'M1034', name: 'Limit Hardware Installation', desc: 'Restrict connection of unauthorized USB/hardware devices.' },
  M1032: { id: 'M1032', name: 'Multi-factor Authentication', desc: 'Enforce MFA on all critical access (VPN, RDP, cloud, admin).' },
  M1031: { id: 'M1031', name: 'Network Intrusion Prevention', desc: 'Deploy IDS/IPS to detect and block malicious network signatures.' },
  M1030: { id: 'M1030', name: 'Network Segmentation', desc: 'Segment the network to limit lateral movement.' },
  M1028: { id: 'M1028', name: 'Operating System Configuration', desc: 'Harden the OS configuration (disable SMBv1, macros, PowerShell v2).' },
  M1027: { id: 'M1027', name: 'Password Policies', desc: 'Strong password policies + detection of compromised credentials.' },
  M1026: { id: 'M1026', name: 'Privileged Account Management', desc: 'Privileged access management (PAM), Just-In-Time access, AD tiering.' },
  M1024: { id: 'M1024', name: 'Restrict Registry Permissions', desc: 'Restrict write permissions on sensitive registry keys.' },
  M1022: { id: 'M1022', name: 'Restrict File and Directory Permissions', desc: 'Control ACLs on critical files/directories.' },
  M1021: { id: 'M1021', name: 'Restrict Web-Based Content', desc: 'Web filtering, block dangerous file types, disable macros.' },
  M1020: { id: 'M1020', name: 'SSL/TLS Inspection', desc: 'Inspect outbound TLS traffic via MITM proxy to detect C2.' },
  M1019: { id: 'M1019', name: 'Threat Intelligence Program', desc: 'Integrate threat intelligence (IOCs, TTPs) into detection tools.' },
  M1018: { id: 'M1018', name: 'User Account Management', desc: 'Least privilege principle, regular review of accounts and permissions.' },
  M1017: { id: 'M1017', name: 'User Training', desc: 'Train users to recognize phishing and social engineering.' },
  M1016: { id: 'M1016', name: 'Vulnerability Scanning', desc: 'Scan vulnerabilities regularly and prioritize patching.' },
  M1015: { id: 'M1015', name: 'Active Directory Configuration', desc: 'Harden AD: disable LLMNR/NBT-NS, enable LDAP signing, configure GPOs.' },
  M1054: { id: 'M1054', name: 'Software Configuration', desc: 'Configure software to reduce the attack surface (disable macros, etc.).' },
  M1053: { id: 'M1053', name: 'Data Backup', desc: 'Immutable and offline backups. Test restoration regularly.' },
  M1051: { id: 'M1051', name: 'Update Software', desc: 'Apply security patches quickly. Prioritize exploited CVEs.' },
  M1050: { id: 'M1050', name: 'Exploit Protection', desc: 'Enable anti-exploit protections (DEP, ASLR, CFG) on endpoints.' },
  M1056: { id: 'M1056', name: 'Pre-compromise', desc: 'Reduce the external attack surface: scan exposed assets, WAF.' },
  M1057: { id: 'M1057', name: 'Data Loss Prevention', desc: 'DLP to monitor and block sensitive data transfers.' },
};

// ============================================================
// Per-Technique: mitigations, data sources, Sigma guidance
// ============================================================
export const TECHNIQUE_INTEL = {
  // ── Initial Access ──
  'T1566': {
    mitigations: ['M1049', 'M1031', 'M1021', 'M1017', 'M1054'],
    dataSources: ['Email gateway logs', 'Network traffic (SMTP/HTTP)', 'File creation events'],
    sigmaGuidance: 'Create rules on suspicious email attachments (.hta, .js, .vbs, .iso, .lnk). Monitor Sysmon EID 15 (FileCreateStreamHash) for email downloads.',
    detectionPriority: 'critical',
  },
  'T1566.001': {
    mitigations: ['M1049', 'M1031', 'M1021', 'M1017'],
    dataSources: ['Email gateway logs (attachment analysis)', 'File creation in Outlook temp', 'Process creation from Office apps'],
    sigmaGuidance: 'Detect suspicious child processes of WINWORD.EXE/EXCEL.EXE (cmd, powershell, mshta, wscript). Sigma tag: proc_creation_win_office_child_process.',
    detectionPriority: 'critical',
  },
  'T1566.002': {
    mitigations: ['M1021', 'M1017', 'M1054'],
    dataSources: ['Email gateway logs (URL analysis)', 'Proxy logs', 'DNS logs'],
    sigmaGuidance: 'Monitor URL clicks in emails towards recently registered domains (<30 days). Correlate with proxy logs to spot suspicious redirects.',
    detectionPriority: 'critical',
  },
  'T1190': {
    mitigations: ['M1048', 'M1050', 'M1051', 'M1016', 'M1056'],
    dataSources: ['WAF logs', 'Application logs', 'Network IDS/IPS alerts'],
    sigmaGuidance: 'Monitor WAF alerts (SQLi, XSS, path traversal), series of 500 errors, and abnormal POST connections to API endpoints. Use existing Sigma web_* rules.',
    detectionPriority: 'critical',
  },
  'T1133': {
    mitigations: ['M1032', 'M1030', 'M1035', 'M1018'],
    dataSources: ['VPN logs', 'RDP logs (Event 4624 LogonType 10)', 'Firewall logs'],
    sigmaGuidance: 'Detect VPN/RDP connections from unusual IPs or abnormal hours. Sigma: win_security_rdp_logon_anomaly.',
    detectionPriority: 'high',
  },
  'T1078': {
    mitigations: ['M1032', 'M1027', 'M1026', 'M1036', 'M1018'],
    dataSources: ['Authentication logs (4624/4625)', 'Azure AD sign-in logs', 'UEBA baselines'],
    sigmaGuidance: 'Detect logons from impossible locations (impossible travel), logons at unusual hours, or accounts used on new machines.',
    detectionPriority: 'critical',
  },
  'T1195': {
    mitigations: ['M1016', 'M1051', 'M1048'],
    dataSources: ['Software installation logs', 'File integrity monitoring', 'Network traffic to update servers'],
    sigmaGuidance: 'Monitor unexpected modifications of signed binaries, DLLs loaded from unusual paths, and outbound connections from update processes.',
    detectionPriority: 'high',
  },
  'T1189': {
    mitigations: ['M1050', 'M1048', 'M1021', 'M1051'],
    dataSources: ['Proxy logs', 'Browser process creation', 'Exploit protection alerts'],
    sigmaGuidance: 'Monitor browser child processes (Chrome/Edge/Firefox) that launch executables or scripts. Sigma: proc_creation_win_browser_child_process.',
    detectionPriority: 'high',
  },

  // ── Execution ──
  'T1059': {
    mitigations: ['M1049', 'M1038', 'M1040', 'M1026'],
    dataSources: ['Process creation (Sysmon EID 1)', 'Script block logging (EID 4104)', 'Command line auditing'],
    sigmaGuidance: 'Enable PowerShell logging (Module logging + Script Block logging). Monitor Sysmon EID 1 for all command interpreters. This is the foundation of any detection.',
    detectionPriority: 'critical',
  },
  'T1059.001': {
    mitigations: ['M1049', 'M1038', 'M1040', 'M1045'],
    dataSources: ['PowerShell Script Block Logging (EID 4104)', 'PowerShell Module Logging (EID 4103)', 'Process creation (Sysmon EID 1)'],
    sigmaGuidance: 'Essential rules: EncodedCommand detection, Download cradle (IEX/IWR), AMSI bypass attempts, Base64-encoded payloads. Sigma: posh_ps_*, proc_creation_win_powershell_*.',
    detectionPriority: 'critical',
  },
  'T1059.003': {
    mitigations: ['M1038', 'M1040'],
    dataSources: ['Process creation (Sysmon EID 1)', 'Command line auditing (Security EID 4688)'],
    sigmaGuidance: 'Detect cmd.exe with suspicious arguments: /c with long commands, redirection to files, calls to certutil/bitsadmin/mshta.',
    detectionPriority: 'high',
  },
  'T1059.004': {
    mitigations: ['M1038', 'M1040'],
    dataSources: ['Process creation (auditd)', 'Shell history files', 'Syslog'],
    sigmaGuidance: 'Monitor reverse shells (bash -i >& /dev/tcp/), downloads via curl/wget, and scripts executed from /tmp or /dev/shm.',
    detectionPriority: 'high',
  },
  'T1204': {
    mitigations: ['M1017', 'M1038'],
    dataSources: ['Process creation from user-initiated apps', 'File creation events'],
    sigmaGuidance: 'Detect executions of files from Downloads, Temp folders, and attachments. Monitor LNK, ISO, VHD and Office files with macros.',
    detectionPriority: 'high',
  },
  'T1053': {
    mitigations: ['M1026', 'M1028', 'M1047'],
    dataSources: ['Scheduled Task creation (Security EID 4698)', 'Sysmon EID 1', 'at/cron logs'],
    sigmaGuidance: 'Monitor EID 4698 (task creation) for tasks that run powershell, cmd, wscript, regsvr32. Sigma: win_security_scheduled_task_creation.',
    detectionPriority: 'high',
  },
  'T1053.005': {
    mitigations: ['M1026', 'M1028', 'M1047'],
    dataSources: ['Windows Security Event 4698 (Task Created)', 'Windows Security Event 4702 (Task Updated)', 'Sysmon EID 1'],
    sigmaGuidance: 'Create a Sigma rule on EventID 4698 filtering TaskContent for powershell/cmd/wscript/mshta. Also alert on tasks created by non-admin accounts.',
    detectionPriority: 'high',
  },
  'T1047': {
    mitigations: ['M1026', 'M1040', 'M1038'],
    dataSources: ['Process creation (wmiprvse.exe children)', 'WMI event subscription logs', 'Sysmon EID 1, 19, 20, 21'],
    sigmaGuidance: 'Detect wmiprvse.exe child processes that are not system processes. Monitor Sysmon EID 19-21 for persistent WMI Event Consumers.',
    detectionPriority: 'high',
  },
  'T1203': {
    mitigations: ['M1048', 'M1050', 'M1051'],
    dataSources: ['Exploit protection alerts (Windows Defender EG)', 'Process creation from vulnerable apps', 'Crash reports'],
    sigmaGuidance: 'Monitor child processes of frequently targeted apps (Adobe Reader, Office, browsers) that launch cmd/powershell. Enable Windows Exploit Guard.',
    detectionPriority: 'high',
  },

  // ── Persistence ──
  'T1547': {
    mitigations: ['M1024', 'M1022', 'M1038'],
    dataSources: ['Registry modification (Sysmon EID 12/13/14)', 'File creation in Startup folders', 'Scheduled tasks'],
    sigmaGuidance: 'Monitor modifications of Run/RunOnce registry keys. Watch files created in Startup folders. Sigma: registry_set_win_run_keys_*.',
    detectionPriority: 'critical',
  },
  'T1547.001': {
    mitigations: ['M1024', 'M1022'],
    dataSources: ['Sysmon EID 12/13 (Registry Set)', 'File creation in shell:startup'],
    sigmaGuidance: 'Sigma rule on Sysmon EID 13 targeting HKCU/HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run with values pointing to suspicious scripts or executables.',
    detectionPriority: 'critical',
  },
  'T1543': {
    mitigations: ['M1022', 'M1047', 'M1028'],
    dataSources: ['Service creation (System EID 7045)', 'Sysmon EID 1 (sc.exe, New-Service)'],
    sigmaGuidance: 'Monitor System EID 7045 for newly created services. Alert on services with binary paths in Temp, AppData, or using cmd/powershell.',
    detectionPriority: 'high',
  },
  'T1543.003': {
    mitigations: ['M1022', 'M1047', 'M1028'],
    dataSources: ['System Event 7045 (Service Created)', 'Registry: HKLM\\SYSTEM\\CurrentControlSet\\Services'],
    sigmaGuidance: 'Sigma rule: System EID 7045 where ServiceFileName contains powershell, cmd, or user paths. Sigma: win_system_service_creation_*.',
    detectionPriority: 'high',
  },
  'T1136': {
    mitigations: ['M1032', 'M1018', 'M1030'],
    dataSources: ['Security Event 4720 (Account Created)', 'Azure AD audit logs', 'net user commands'],
    sigmaGuidance: 'Monitor EID 4720 for local account creation. Alert on accounts created outside normal HR/IT processes, especially if added to the Administrators group.',
    detectionPriority: 'high',
  },
  'T1098': {
    mitigations: ['M1032', 'M1026', 'M1018'],
    dataSources: ['Security Event 4728/4732/4756 (Group membership changes)', 'Azure AD audit logs'],
    sigmaGuidance: 'Monitor additions to privileged groups (Domain Admins, Administrators). Sigma: win_security_group_membership_change.',
    detectionPriority: 'critical',
  },

  // ── Privilege Escalation ──
  'T1548': {
    mitigations: ['M1026', 'M1047', 'M1022'],
    dataSources: ['Process creation with elevated tokens', 'UAC bypass indicators', 'Sysmon EID 1'],
    sigmaGuidance: 'Detect known UAC bypasses: eventvwr.exe, fodhelper.exe, computerdefaults.exe. Sigma: proc_creation_win_uac_bypass_*.',
    detectionPriority: 'high',
  },
  'T1068': {
    mitigations: ['M1050', 'M1051', 'M1048'],
    dataSources: ['Exploit protection alerts', 'Process crash reports', 'Sysmon (unusual process chains)'],
    sigmaGuidance: 'Enable Exploit Protection (Windows Defender EG). Monitor processes that obtain SYSTEM after being launched by a standard user.',
    detectionPriority: 'high',
  },
  'T1134': {
    mitigations: ['M1026', 'M1018'],
    dataSources: ['Security Event 4624 (LogonType 9 - NewCredentials)', 'Process access events', 'Token manipulation API calls'],
    sigmaGuidance: 'Monitor calls to AdjustTokenPrivileges and ImpersonateLoggedOnUser via Sysmon. Detect RunAs and LogonType 9.',
    detectionPriority: 'medium',
  },

  // ── Defense Evasion ──
  'T1562': {
    mitigations: ['M1022', 'M1024', 'M1018'],
    dataSources: ['Security product status changes', 'Service stop events (7036)', 'Process termination of security tools'],
    sigmaGuidance: 'Monitor shutdown/disablement of Windows Defender (EID 5001, 5010), Sysmon, and EDR services. Sigma: win_security_defender_disabled.',
    detectionPriority: 'critical',
  },
  'T1562.001': {
    mitigations: ['M1022', 'M1024', 'M1018'],
    dataSources: ['Windows Defender Events (5001, 5010, 5013)', 'Service control manager events', 'Registry modifications for security tools'],
    sigmaGuidance: 'Alert on Windows Defender disablement via Set-MpPreference -DisableRealtimeMonitoring $true, or removal of the WinDefend service.',
    detectionPriority: 'critical',
  },
  'T1070': {
    mitigations: ['M1029', 'M1022'],
    dataSources: ['Security Event 1102 (Audit log cleared)', 'File deletion in log directories', 'Timestomp detection (Sysmon EID 2)'],
    sigmaGuidance: 'Monitor EID 1102 (log cleared), deletion of .evtx files, and timestamp modifications (Sysmon EID 2). Sigma: win_security_log_cleared.',
    detectionPriority: 'critical',
  },
  'T1070.001': {
    mitigations: ['M1029', 'M1022'],
    dataSources: ['Security Event 1102', 'System Event 104'],
    sigmaGuidance: 'Simple Sigma rule: alert on EventID 1102 (Security log cleared) and System EventID 104. Any log deletion is suspicious.',
    detectionPriority: 'critical',
  },
  'T1036': {
    mitigations: ['M1038', 'M1022', 'M1045'],
    dataSources: ['Process creation with path analysis', 'File metadata analysis', 'Digital signature validation'],
    sigmaGuidance: 'Detect executables named like system processes (svchost, csrss) but launched from unusual paths. Sigma: proc_creation_win_renamed_binary_*.',
    detectionPriority: 'high',
  },
  'T1027': {
    mitigations: ['M1049', 'M1040'],
    dataSources: ['Script block logging (EID 4104)', 'File analysis (entropy)', 'Process creation (encoded arguments)'],
    sigmaGuidance: 'Enable PowerShell Script Block Logging. Detect long Base64 strings in command arguments. Sigma: posh_ps_suspicious_script_block_logging.',
    detectionPriority: 'high',
  },
  'T1055': {
    mitigations: ['M1040', 'M1026'],
    dataSources: ['Sysmon EID 8 (CreateRemoteThread)', 'Sysmon EID 10 (ProcessAccess)', 'API monitoring'],
    sigmaGuidance: 'Monitor Sysmon EID 8 (CreateRemoteThread) and EID 10 (ProcessAccess) targeting sensitive processes like lsass.exe, explorer.exe. Sigma: sysmon_crt_*.',
    detectionPriority: 'critical',
  },
  'T1218': {
    mitigations: ['M1038', 'M1040'],
    dataSources: ['Process creation (Sysmon EID 1)', 'Loaded DLLs (Sysmon EID 7)'],
    sigmaGuidance: 'Detect LOLBin usage: mshta, rundll32, regsvr32, certutil, wmic to execute code. Sigma: proc_creation_win_lolbin_*.',
    detectionPriority: 'critical',
  },

  // ── Credential Access ──
  'T1003': {
    mitigations: ['M1026', 'M1028', 'M1040', 'M1017', 'M1043'],
    dataSources: ['Sysmon EID 10 (ProcessAccess to lsass.exe)', 'Security Event 4656/4663', 'Windows Defender Credential Guard'],
    sigmaGuidance: 'Critical rule: Sysmon EID 10 with TargetImage=lsass.exe and GrantedAccess containing 0x1010/0x1410/0x1f1fff. This is the basic Mimikatz detection.',
    detectionPriority: 'critical',
  },
  'T1003.001': {
    mitigations: ['M1026', 'M1028', 'M1040', 'M1043'],
    dataSources: ['Sysmon EID 10 (TargetImage: lsass.exe)', 'Security Event 4656 (SAM access)', 'Credential Guard alerts'],
    sigmaGuidance: 'Sysmon EID 10: TargetImage=*\\lsass.exe with GrantedAccess in (0x1010, 0x1410, 0x147a, 0x1f1fff, 0x1f3fff). Sigma: sysmon_lsass_access.',
    detectionPriority: 'critical',
  },
  'T1110': {
    mitigations: ['M1032', 'M1027', 'M1036', 'M1018'],
    dataSources: ['Security Event 4625 (Failed logon)', 'Azure AD sign-in logs', 'Authentication server logs'],
    sigmaGuidance: 'Detect >10 EID 4625 from the same IP within 10 minutes. For Azure AD: SignInLogs with ResultType=50126 (invalid password) aggregated by IP.',
    detectionPriority: 'critical',
  },
  'T1110.003': {
    mitigations: ['M1032', 'M1027', 'M1036'],
    dataSources: ['Security Event 4625 (multiple accounts, same IP)', 'Azure AD sign-in logs'],
    sigmaGuidance: 'Password spraying: >5 EID 4625 with DIFFERENT accounts from the same IP within 10 minutes. Sigma: win_security_password_spray.',
    detectionPriority: 'critical',
  },
  'T1558': {
    mitigations: ['M1027', 'M1015', 'M1026'],
    dataSources: ['Security Event 4769 (Kerberos service ticket)', 'Domain Controller logs'],
    sigmaGuidance: 'Kerberoasting: EID 4769 with TicketEncryptionType=0x17 (RC4) and ServiceName not starting with krbtgt$. Sigma: win_security_kerberoasting.',
    detectionPriority: 'high',
  },
  'T1555': {
    mitigations: ['M1027', 'M1026'],
    dataSources: ['File access to browser credential stores', 'Process access to credential files'],
    sigmaGuidance: 'Monitor access to Login Data (Chrome), logins.json (Firefox), and queries to Credential Manager.',
    detectionPriority: 'high',
  },

  // ── Discovery ──
  'T1082': {
    mitigations: [],
    dataSources: ['Process creation (systeminfo, hostname, whoami)', 'Sysmon EID 1'],
    sigmaGuidance: 'Detect sequential execution of recon commands: whoami, systeminfo, ipconfig, net user. Sigma: proc_creation_win_recon_commands.',
    detectionPriority: 'medium',
  },
  'T1083': {
    mitigations: [],
    dataSources: ['Process creation (dir, find, ls)', 'File access events'],
    sigmaGuidance: 'Watch dir/tree/Get-ChildItem over many directories in a short time, especially on network shares.',
    detectionPriority: 'low',
  },
  'T1016': {
    mitigations: [],
    dataSources: ['Process creation (ipconfig, ifconfig, route)', 'Sysmon EID 1'],
    sigmaGuidance: 'Detect ipconfig /all, route print, arp -a, nslookup executed in quick sequence. Sigma: proc_creation_win_network_recon.',
    detectionPriority: 'medium',
  },
  'T1046': {
    mitigations: ['M1030', 'M1031'],
    dataSources: ['Network flow logs', 'IDS/IPS alerts', 'Firewall logs (port scan patterns)'],
    sigmaGuidance: 'Detect port scanning: >50 SYN connections to different ports from the same source within 60 seconds. Use Firewall/IDS logs.',
    detectionPriority: 'high',
  },
  'T1087': {
    mitigations: ['M1028'],
    dataSources: ['Process creation (net user, net group)', 'LDAP queries', 'AD enumeration tools'],
    sigmaGuidance: 'Monitor net user /domain, net group "Domain Admins", and suspicious LDAP queries (filter on objectCategory=person or group). Sigma: proc_creation_win_ad_enum.',
    detectionPriority: 'medium',
  },

  // ── Lateral Movement ──
  'T1021': {
    mitigations: ['M1032', 'M1035', 'M1030', 'M1026'],
    dataSources: ['Security Event 4624 (Network logon)', 'SMB session logs', 'RDP connection logs'],
    sigmaGuidance: 'Monitor EID 4624 LogonType 3 (Network) and 10 (RemoteInteractive/RDP) from unusual source machines. Correlate with network flows.',
    detectionPriority: 'high',
  },
  'T1021.001': {
    mitigations: ['M1032', 'M1035', 'M1030', 'M1026'],
    dataSources: ['Security Event 4624 LogonType 10', 'RDP Client Connection (EID 1024)', 'Network flow (port 3389)'],
    sigmaGuidance: 'Detect RDP connections from non-admin machines, to sensitive servers, or outside business hours. Sigma: win_security_rdp_*.',
    detectionPriority: 'high',
  },
  'T1021.002': {
    mitigations: ['M1035', 'M1030', 'M1026', 'M1028'],
    dataSources: ['Security Event 4624 LogonType 3', 'SMB share access (EID 5140)', 'Service creation on remote hosts'],
    sigmaGuidance: 'Detect PsExec: EID 7045 (new PSEXESVC service) + EID 4624 LogonType 3 NTLM. Sigma: win_security_psexec_service.',
    detectionPriority: 'high',
  },
  'T1550': {
    mitigations: ['M1026', 'M1032', 'M1018'],
    dataSources: ['Security Event 4624 (NTLM authentication)', 'Kerberos ticket events (4768, 4769)'],
    sigmaGuidance: 'Pass-the-Hash: EID 4624 with LogonType 9 (NewCredentials) or NTLM used when Kerberos is expected. Pass-the-Ticket: abnormal TGT/TGS.',
    detectionPriority: 'critical',
  },
  'T1570': {
    mitigations: ['M1037', 'M1031', 'M1030'],
    dataSources: ['SMB file transfer logs', 'Admin$ share access', 'Network flow analysis'],
    sigmaGuidance: 'Monitor executable file transfers via SMB/admin shares. Watch EID 5140/5145 for access to ADMIN$ and C$.',
    detectionPriority: 'high',
  },

  // ── Collection ──
  'T1074': {
    mitigations: ['M1022'],
    dataSources: ['File creation events (large archives)', 'Process creation (rar, 7z, zip)'],
    sigmaGuidance: 'Detect creation of .zip/.rar/.7z files in temp folders, especially containing data files. Sigma: file_event_win_staging.',
    detectionPriority: 'medium',
  },
  'T1113': {
    mitigations: [],
    dataSources: ['API monitoring (GDI32 screen capture)', 'Process access to display devices'],
    sigmaGuidance: 'Monitor non-standard processes calling screen capture APIs (BitBlt, PrintWindow). Few existing Sigma sources.',
    detectionPriority: 'low',
  },
  'T1056': {
    mitigations: [],
    dataSources: ['API monitoring (SetWindowsHookEx)', 'Process loading of hook DLLs'],
    sigmaGuidance: 'Detect calls to SetWindowsHookEx with WH_KEYBOARD_LL from non-standard processes. Monitoring via Sysmon or EDR.',
    detectionPriority: 'medium',
  },

  // ── Exfiltration ──
  'T1041': {
    mitigations: ['M1031', 'M1037', 'M1057'],
    dataSources: ['Network traffic analysis', 'DLP alerts', 'Proxy logs (large uploads)'],
    sigmaGuidance: 'Monitor large outbound uploads (>10MB) via HTTP/HTTPS to uncategorized domains. Correlate with DLP alerts.',
    detectionPriority: 'high',
  },
  'T1048': {
    mitigations: ['M1031', 'M1037', 'M1057'],
    dataSources: ['DNS query logs (long queries = DNS tunneling)', 'Network flow (unusual protocols)', 'Firewall logs'],
    sigmaGuidance: 'DNS exfiltration: detect DNS queries with subdomains >50 characters or >500 queries/hour to the same domain.',
    detectionPriority: 'high',
  },
  'T1567': {
    mitigations: ['M1021', 'M1057'],
    dataSources: ['Proxy logs (uploads to cloud storage)', 'CASB alerts', 'DLP'],
    sigmaGuidance: 'Monitor uploads to mega.nz, transfer.sh, anonfiles.com, wetransfer.com, or any service not approved by the organization.',
    detectionPriority: 'high',
  },
  'T1567.002': {
    mitigations: ['M1021', 'M1057'],
    dataSources: ['Proxy logs (PUT/POST to cloud storage APIs)', 'CASB (Netskope, Zscaler)', 'DLP alerts'],
    sigmaGuidance: 'Detect uploads to personal cloud services (Dropbox, personal OneDrive) via proxy logs. Filter on PUT/POST methods >5MB.',
    detectionPriority: 'high',
  },

  // ── Command and Control ──
  'T1071': {
    mitigations: ['M1031', 'M1030', 'M1020'],
    dataSources: ['Proxy logs', 'DNS logs', 'Network flow analysis', 'TLS/JA3 fingerprinting'],
    sigmaGuidance: 'Detect C2 beacons: periodic HTTP/HTTPS connections (fixed interval ±jitter) to low-reputation domains. Analyze JA3 fingerprints.',
    detectionPriority: 'critical',
  },
  'T1071.001': {
    mitigations: ['M1031', 'M1030', 'M1020'],
    dataSources: ['Proxy logs (HTTP/HTTPS)', 'User-Agent analysis', 'TLS certificate analysis'],
    sigmaGuidance: 'Monitor unusual User-Agents, HTTPS connections to IPs (no domain), and recent self-signed or Let\'s Encrypt certificates.',
    detectionPriority: 'critical',
  },
  'T1573': {
    mitigations: ['M1031', 'M1020'],
    dataSources: ['TLS inspection logs', 'JA3/JA3S fingerprinting', 'Network flow (encrypted traffic to unusual ports)'],
    sigmaGuidance: 'Identify non-standard encrypted communications: TLS on unusual ports (not 443), known malware JA3 fingerprints (Cobalt Strike, Metasploit).',
    detectionPriority: 'high',
  },
  'T1090': {
    mitigations: ['M1031', 'M1037'],
    dataSources: ['Network flow analysis', 'Proxy logs', 'Tor exit node lists'],
    sigmaGuidance: 'Detect connections to known Tor nodes, or SOCKS proxy usage. Monitor processes establishing tunnels (ssh, plink, chisel).',
    detectionPriority: 'high',
  },
  'T1572': {
    mitigations: ['M1037', 'M1031'],
    dataSources: ['Network traffic (tunneled protocols)', 'DNS over HTTPS detection', 'Process creation (ssh, plink)'],
    sigmaGuidance: 'Detect tunnels: SSH with port forwarding (-L, -R, -D), DNS over HTTPS to external resolvers, ICMP tunneling.',
    detectionPriority: 'high',
  },

  // ── Impact ──
  'T1486': {
    mitigations: ['M1053', 'M1040', 'M1049'],
    dataSources: ['File modification events (mass rename)', 'VSS events', 'Process creation (ransomware indicators)'],
    sigmaGuidance: 'Detect massive file modification (>100 files renamed in <1 minute), shadow copy deletion, and ransom notes. Sigma: file_event_win_ransomware_*.',
    detectionPriority: 'critical',
  },
  'T1490': {
    mitigations: ['M1053', 'M1028'],
    dataSources: ['Process creation (vssadmin, wmic, bcdedit)', 'PowerShell script block logging'],
    sigmaGuidance: 'Simple rule: detect "vssadmin delete shadows", "wmic shadowcopy delete", "bcdedit /set recoveryenabled no". Sigma: proc_creation_win_shadow_copy_deletion.',
    detectionPriority: 'critical',
  },
  'T1489': {
    mitigations: ['M1030', 'M1022', 'M1024'],
    dataSources: ['Service control events (7036)', 'Process creation (net stop, sc stop)'],
    sigmaGuidance: 'Monitor shutdown of critical services: SQL, Exchange, backup, antivirus via "net stop" or "sc stop". Sigma: proc_creation_win_service_stop.',
    detectionPriority: 'high',
  },
  'T1485': {
    mitigations: ['M1053'],
    dataSources: ['File deletion events', 'Disk wipe tool detection', 'MBR modification alerts'],
    sigmaGuidance: 'Detect destruction tools (cipher /w, sdelete, shred) and direct disk access (PhysicalDrive0). Sigma: proc_creation_win_disk_wipe.',
    detectionPriority: 'critical',
  },
  'T1499': {
    mitigations: ['M1037'],
    dataSources: ['Network traffic analysis', 'Web server logs', 'Load balancer metrics'],
    sigmaGuidance: 'Monitor abnormal traffic spikes, HTTP/HTTPS requests from multiple sources, and WAF flood/DDoS alerts.',
    detectionPriority: 'medium',
  },
};

// Fallback for techniques not in the detailed map
export function getTechniqueIntel(techniqueId) {
  // Try exact match
  if (TECHNIQUE_INTEL[techniqueId]) return TECHNIQUE_INTEL[techniqueId];
  // Try parent technique
  const parent = techniqueId.split('.')[0];
  if (TECHNIQUE_INTEL[parent]) return { ...TECHNIQUE_INTEL[parent], _fromParent: true };
  // Generic fallback
  return {
    mitigations: [],
    dataSources: ['System logs', 'Network traffic'],
    sigmaGuidance: `No specific Sigma guidance for ${techniqueId}. See https://attack.mitre.org/techniques/${techniqueId.replace('.', '/')}/`,
    detectionPriority: 'medium',
    _fallback: true,
  };
}
