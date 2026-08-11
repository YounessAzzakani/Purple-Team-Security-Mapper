// ============================================================
// Per-Technique Mitigations, Data Sources & Sigma Guidance
// Source: MITRE ATT&CK Enterprise v15 Mitigations + Data Sources
// ============================================================

// MITRE Mitigations reference
export const MITIGATIONS = {
  M1049: { id: 'M1049', name: 'Antivirus/Antimalware', desc: 'Utiliser un anti-malware à jour avec détection comportementale et heuristique.' },
  M1048: { id: 'M1048', name: 'Application Isolation and Sandboxing', desc: 'Isoler les applications à haut risque (navigateurs, clients email) via sandboxing.' },
  M1047: { id: 'M1047', name: 'Audit', desc: 'Auditer régulièrement les configurations, permissions et comptes.' },
  M1040: { id: 'M1040', name: 'Behavior Prevention on Endpoint', desc: 'Utiliser des règles EDR comportementales pour bloquer les actions suspectes.' },
  M1038: { id: 'M1038', name: 'Execution Prevention', desc: 'Application whitelisting — n\'autoriser que les exécutables approuvés.' },
  M1037: { id: 'M1037', name: 'Filter Network Traffic', desc: 'Filtrage réseau (NGFW, proxy, IPS) pour bloquer le trafic malveillant.' },
  M1036: { id: 'M1036', name: 'Account Use Policies', desc: 'Politiques de verrouillage, rotation, et complexité des mots de passe.' },
  M1035: { id: 'M1035', name: 'Limit Access to Resource Over Network', desc: 'Restreindre les accès réseau aux ressources sensibles (micro-segmentation).' },
  M1034: { id: 'M1034', name: 'Limit Hardware Installation', desc: 'Restreindre la connexion de périphériques USB/matériel non autorisé.' },
  M1032: { id: 'M1032', name: 'Multi-factor Authentication', desc: 'Imposer MFA sur tous les accès critiques (VPN, RDP, cloud, admin).' },
  M1031: { id: 'M1031', name: 'Network Intrusion Prevention', desc: 'Déployer IDS/IPS pour détecter et bloquer les signatures réseau malveillantes.' },
  M1030: { id: 'M1030', name: 'Network Segmentation', desc: 'Segmenter le réseau pour limiter la propagation latérale.' },
  M1028: { id: 'M1028', name: 'Operating System Configuration', desc: 'Durcir la configuration OS (désactiver SMBv1, macros, PowerShell v2).' },
  M1027: { id: 'M1027', name: 'Password Policies', desc: 'Politiques de mots de passe robustes + détection de credentials compromis.' },
  M1026: { id: 'M1026', name: 'Privileged Account Management', desc: 'Gestion des accès privilégiés (PAM), Just-In-Time access, tiering AD.' },
  M1024: { id: 'M1024', name: 'Restrict Registry Permissions', desc: 'Restreindre les permissions d\'écriture sur les clés de registre sensibles.' },
  M1022: { id: 'M1022', name: 'Restrict File and Directory Permissions', desc: 'Contrôler les ACL sur les fichiers/dossiers critiques.' },
  M1021: { id: 'M1021', name: 'Restrict Web-Based Content', desc: 'Filtrage web, bloquer les types de fichiers dangereux, désactiver les macros.' },
  M1020: { id: 'M1020', name: 'SSL/TLS Inspection', desc: 'Inspecter le trafic TLS sortant via proxy MITM pour détecter le C2.' },
  M1019: { id: 'M1019', name: 'Threat Intelligence Program', desc: 'Intégrer la threat intelligence (IOCs, TTPs) dans les outils de détection.' },
  M1018: { id: 'M1018', name: 'User Account Management', desc: 'Principe du moindre privilège, revue régulière des comptes et permissions.' },
  M1017: { id: 'M1017', name: 'User Training', desc: 'Former les utilisateurs à reconnaître le phishing et le social engineering.' },
  M1016: { id: 'M1016', name: 'Vulnerability Scanning', desc: 'Scanner régulièrement les vulnérabilités et prioriser le patching.' },
  M1015: { id: 'M1015', name: 'Active Directory Configuration', desc: 'Durcir AD : désactiver LLMNR/NBT-NS, activer LDAP signing, configurer GPO.' },
  M1054: { id: 'M1054', name: 'Software Configuration', desc: 'Configurer les logiciels pour réduire la surface d\'attaque (désactiver macros, etc.).' },
  M1053: { id: 'M1053', name: 'Data Backup', desc: 'Sauvegardes immuables et hors-ligne. Tester la restauration régulièrement.' },
  M1051: { id: 'M1051', name: 'Update Software', desc: 'Appliquer les patchs de sécurité rapidement. Prioriser les CVE exploitées.' },
  M1050: { id: 'M1050', name: 'Exploit Protection', desc: 'Activer les protections anti-exploit (DEP, ASLR, CFG) sur les endpoints.' },
  M1056: { id: 'M1056', name: 'Pre-compromise', desc: 'Réduire la surface d\'attaque externe : scanner les assets exposés, WAF.' },
  M1057: { id: 'M1057', name: 'Data Loss Prevention', desc: 'DLP pour surveiller et bloquer les transferts de données sensibles.' },
};

// ============================================================
// Per-Technique: mitigations, data sources, Sigma guidance
// ============================================================
export const TECHNIQUE_INTEL = {
  // ── Initial Access ──
  'T1566': {
    mitigations: ['M1049', 'M1031', 'M1021', 'M1017', 'M1054'],
    dataSources: ['Email gateway logs', 'Network traffic (SMTP/HTTP)', 'File creation events'],
    sigmaGuidance: 'Créer des règles sur les pièces jointes suspectes (.hta, .js, .vbs, .iso, .lnk) reçues par email. Monitorer Sysmon EID 15 (FileCreateStreamHash) pour les téléchargements email.',
    detectionPriority: 'critical',
  },
  'T1566.001': {
    mitigations: ['M1049', 'M1031', 'M1021', 'M1017'],
    dataSources: ['Email gateway logs (attachment analysis)', 'File creation in Outlook temp', 'Process creation from Office apps'],
    sigmaGuidance: 'Détecter les processus enfants suspects de WINWORD.EXE/EXCEL.EXE (cmd, powershell, mshta, wscript). Sigma tag: proc_creation_win_office_child_process.',
    detectionPriority: 'critical',
  },
  'T1566.002': {
    mitigations: ['M1021', 'M1017', 'M1054'],
    dataSources: ['Email gateway logs (URL analysis)', 'Proxy logs', 'DNS logs'],
    sigmaGuidance: 'Surveiller les clics URL dans les emails vers des domaines récents (<30 jours). Corréler avec les logs proxy pour identifier les redirections suspectes.',
    detectionPriority: 'critical',
  },
  'T1190': {
    mitigations: ['M1048', 'M1050', 'M1051', 'M1016', 'M1056'],
    dataSources: ['WAF logs', 'Application logs', 'Network IDS/IPS alerts'],
    sigmaGuidance: 'Monitorer les alertes WAF (SQLi, XSS, path traversal), les erreurs 500 en série, et les connexions POST anormales vers des endpoints API. Utiliser les règles Sigma web_* existantes.',
    detectionPriority: 'critical',
  },
  'T1133': {
    mitigations: ['M1032', 'M1030', 'M1035', 'M1018'],
    dataSources: ['VPN logs', 'RDP logs (Event 4624 LogonType 10)', 'Firewall logs'],
    sigmaGuidance: 'Détecter les connexions VPN/RDP depuis des IPs inhabituelles ou des horaires anormaux. Sigma: win_security_rdp_logon_anomaly.',
    detectionPriority: 'high',
  },
  'T1078': {
    mitigations: ['M1032', 'M1027', 'M1026', 'M1036', 'M1018'],
    dataSources: ['Authentication logs (4624/4625)', 'Azure AD sign-in logs', 'UEBA baselines'],
    sigmaGuidance: 'Détecter les connexions depuis des localisations impossibles (impossible travel), les connexions à des heures inhabituelles, ou les comptes utilisés sur des machines nouvelles.',
    detectionPriority: 'critical',
  },
  'T1195': {
    mitigations: ['M1016', 'M1051', 'M1048'],
    dataSources: ['Software installation logs', 'File integrity monitoring', 'Network traffic to update servers'],
    sigmaGuidance: 'Monitorer les modifications inattendues de binaires signés, les DLL chargées depuis des chemins inhabituels, et les connexions sortantes depuis des processus de mise à jour.',
    detectionPriority: 'high',
  },
  'T1189': {
    mitigations: ['M1050', 'M1048', 'M1021', 'M1051'],
    dataSources: ['Proxy logs', 'Browser process creation', 'Exploit protection alerts'],
    sigmaGuidance: 'Surveiller les processus enfants du navigateur (Chrome/Edge/Firefox) qui lancent des exécutables ou scripts. Sigma: proc_creation_win_browser_child_process.',
    detectionPriority: 'high',
  },

  // ── Execution ──
  'T1059': {
    mitigations: ['M1049', 'M1038', 'M1040', 'M1026'],
    dataSources: ['Process creation (Sysmon EID 1)', 'Script block logging (EID 4104)', 'Command line auditing'],
    sigmaGuidance: 'Activer le logging PowerShell (Module logging + Script Block logging). Monitorer Sysmon EID 1 pour tous les interpréteurs de commandes. C\'est la base de toute détection.',
    detectionPriority: 'critical',
  },
  'T1059.001': {
    mitigations: ['M1049', 'M1038', 'M1040', 'M1045'],
    dataSources: ['PowerShell Script Block Logging (EID 4104)', 'PowerShell Module Logging (EID 4103)', 'Process creation (Sysmon EID 1)'],
    sigmaGuidance: 'Règles essentielles : EncodedCommand detection, Download cradle (IEX/IWR), AMSI bypass attempts, Base64-encoded payloads. Sigma: posh_ps_*, proc_creation_win_powershell_*.',
    detectionPriority: 'critical',
  },
  'T1059.003': {
    mitigations: ['M1038', 'M1040'],
    dataSources: ['Process creation (Sysmon EID 1)', 'Command line auditing (Security EID 4688)'],
    sigmaGuidance: 'Détecter cmd.exe avec des arguments suspects : /c avec des commandes longues, redirection vers des fichiers, appels à certutil/bitsadmin/mshta.',
    detectionPriority: 'high',
  },
  'T1059.004': {
    mitigations: ['M1038', 'M1040'],
    dataSources: ['Process creation (auditd)', 'Shell history files', 'Syslog'],
    sigmaGuidance: 'Monitorer les shells inversés (bash -i >& /dev/tcp/), les téléchargements via curl/wget, et les scripts exécutés depuis /tmp ou /dev/shm.',
    detectionPriority: 'high',
  },
  'T1204': {
    mitigations: ['M1017', 'M1038'],
    dataSources: ['Process creation from user-initiated apps', 'File creation events'],
    sigmaGuidance: 'Détecter les exécutions de fichiers depuis les dossiers Downloads, Temp, et les pièces jointes. Monitorer les LNK, ISO, VHD et fichiers Office avec macros.',
    detectionPriority: 'high',
  },
  'T1053': {
    mitigations: ['M1026', 'M1028', 'M1047'],
    dataSources: ['Scheduled Task creation (Security EID 4698)', 'Sysmon EID 1', 'at/cron logs'],
    sigmaGuidance: 'Monitorer EID 4698 (task creation) pour les tâches qui exécutent powershell, cmd, wscript, regsvr32. Sigma: win_security_scheduled_task_creation.',
    detectionPriority: 'high',
  },
  'T1053.005': {
    mitigations: ['M1026', 'M1028', 'M1047'],
    dataSources: ['Windows Security Event 4698 (Task Created)', 'Windows Security Event 4702 (Task Updated)', 'Sysmon EID 1'],
    sigmaGuidance: 'Créer une règle Sigma sur EventID 4698 avec filtre sur TaskContent contenant powershell/cmd/wscript/mshta. Alerter aussi sur les tâches créées par des comptes non-administrateurs.',
    detectionPriority: 'high',
  },
  'T1047': {
    mitigations: ['M1026', 'M1040', 'M1038'],
    dataSources: ['Process creation (wmiprvse.exe children)', 'WMI event subscription logs', 'Sysmon EID 1, 19, 20, 21'],
    sigmaGuidance: 'Détecter les processus enfants de wmiprvse.exe qui ne sont pas des processus système. Monitorer Sysmon EID 19-21 pour les WMI Event Consumers persistants.',
    detectionPriority: 'high',
  },
  'T1203': {
    mitigations: ['M1048', 'M1050', 'M1051'],
    dataSources: ['Exploit protection alerts (Windows Defender EG)', 'Process creation from vulnerable apps', 'Crash reports'],
    sigmaGuidance: 'Surveiller les processus enfants d\'applications souvent ciblées (Adobe Reader, Office, navigateurs) qui lancent cmd/powershell. Activer Windows Exploit Guard.',
    detectionPriority: 'high',
  },

  // ── Persistence ──
  'T1547': {
    mitigations: ['M1024', 'M1022', 'M1038'],
    dataSources: ['Registry modification (Sysmon EID 12/13/14)', 'File creation in Startup folders', 'Scheduled tasks'],
    sigmaGuidance: 'Monitorer les modifications des clés Run/RunOnce dans le registre. Surveiller les fichiers créés dans les dossiers Startup. Sigma: registry_set_win_run_keys_*.',
    detectionPriority: 'critical',
  },
  'T1547.001': {
    mitigations: ['M1024', 'M1022'],
    dataSources: ['Sysmon EID 12/13 (Registry Set)', 'File creation in shell:startup'],
    sigmaGuidance: 'Règle Sigma sur Sysmon EID 13 ciblant HKCU/HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run avec des valeurs pointant vers des scripts ou exécutables suspects.',
    detectionPriority: 'critical',
  },
  'T1543': {
    mitigations: ['M1022', 'M1047', 'M1028'],
    dataSources: ['Service creation (System EID 7045)', 'Sysmon EID 1 (sc.exe, New-Service)'],
    sigmaGuidance: 'Monitorer System EID 7045 pour les nouveaux services créés. Alerter sur les services avec des chemins binaires dans Temp, AppData, ou utilisant cmd/powershell.',
    detectionPriority: 'high',
  },
  'T1543.003': {
    mitigations: ['M1022', 'M1047', 'M1028'],
    dataSources: ['System Event 7045 (Service Created)', 'Registry: HKLM\\SYSTEM\\CurrentControlSet\\Services'],
    sigmaGuidance: 'Règle Sigma : System EID 7045 où le ServiceFileName contient powershell, cmd, ou des chemins utilisateur. Sigma: win_system_service_creation_*.',
    detectionPriority: 'high',
  },
  'T1136': {
    mitigations: ['M1032', 'M1018', 'M1030'],
    dataSources: ['Security Event 4720 (Account Created)', 'Azure AD audit logs', 'net user commands'],
    sigmaGuidance: 'Monitorer EID 4720 pour la création de comptes locaux. Alerter sur les comptes créés en dehors des processus RH/IT normaux, surtout si ajoutés au groupe Administrators.',
    detectionPriority: 'high',
  },
  'T1098': {
    mitigations: ['M1032', 'M1026', 'M1018'],
    dataSources: ['Security Event 4728/4732/4756 (Group membership changes)', 'Azure AD audit logs'],
    sigmaGuidance: 'Monitorer les ajouts aux groupes privilégiés (Domain Admins, Administrators). Sigma: win_security_group_membership_change.',
    detectionPriority: 'critical',
  },

  // ── Privilege Escalation ──
  'T1548': {
    mitigations: ['M1026', 'M1047', 'M1022'],
    dataSources: ['Process creation with elevated tokens', 'UAC bypass indicators', 'Sysmon EID 1'],
    sigmaGuidance: 'Détecter les bypass UAC connus : eventvwr.exe, fodhelper.exe, computerdefaults.exe. Sigma: proc_creation_win_uac_bypass_*.',
    detectionPriority: 'high',
  },
  'T1068': {
    mitigations: ['M1050', 'M1051', 'M1048'],
    dataSources: ['Exploit protection alerts', 'Process crash reports', 'Sysmon (unusual process chains)'],
    sigmaGuidance: 'Activer Exploit Protection (Windows Defender EG). Monitorer les processus qui obtiennent SYSTEM après avoir été lancés par un utilisateur standard.',
    detectionPriority: 'high',
  },
  'T1134': {
    mitigations: ['M1026', 'M1018'],
    dataSources: ['Security Event 4624 (LogonType 9 - NewCredentials)', 'Process access events', 'Token manipulation API calls'],
    sigmaGuidance: 'Surveiller les appels à AdjustTokenPrivileges et ImpersonateLoggedOnUser via Sysmon. Détecter RunAs et les LogonType 9.',
    detectionPriority: 'medium',
  },

  // ── Defense Evasion ──
  'T1562': {
    mitigations: ['M1022', 'M1024', 'M1018'],
    dataSources: ['Security product status changes', 'Service stop events (7036)', 'Process termination of security tools'],
    sigmaGuidance: 'Monitorer l\'arrêt/désactivation de Windows Defender (EID 5001, 5010), Sysmon, et les services EDR. Sigma: win_security_defender_disabled.',
    detectionPriority: 'critical',
  },
  'T1562.001': {
    mitigations: ['M1022', 'M1024', 'M1018'],
    dataSources: ['Windows Defender Events (5001, 5010, 5013)', 'Service control manager events', 'Registry modifications for security tools'],
    sigmaGuidance: 'Alerter sur la désactivation de Windows Defender via Set-MpPreference -DisableRealtimeMonitoring $true, ou la suppression du service WinDefend.',
    detectionPriority: 'critical',
  },
  'T1070': {
    mitigations: ['M1029', 'M1022'],
    dataSources: ['Security Event 1102 (Audit log cleared)', 'File deletion in log directories', 'Timestomp detection (Sysmon EID 2)'],
    sigmaGuidance: 'Monitorer EID 1102 (log cleared), la suppression de fichiers .evtx, et les modifications de timestamps (Sysmon EID 2). Sigma: win_security_log_cleared.',
    detectionPriority: 'critical',
  },
  'T1070.001': {
    mitigations: ['M1029', 'M1022'],
    dataSources: ['Security Event 1102', 'System Event 104'],
    sigmaGuidance: 'Règle Sigma simple : alerter sur EventID 1102 (Security log cleared) et System EventID 104. Toute suppression de log est suspecte.',
    detectionPriority: 'critical',
  },
  'T1036': {
    mitigations: ['M1038', 'M1022', 'M1045'],
    dataSources: ['Process creation with path analysis', 'File metadata analysis', 'Digital signature validation'],
    sigmaGuidance: 'Détecter les exécutables nommés comme des processus système (svchost, csrss) mais lancés depuis des chemins inhabituels. Sigma: proc_creation_win_renamed_binary_*.',
    detectionPriority: 'high',
  },
  'T1027': {
    mitigations: ['M1049', 'M1040'],
    dataSources: ['Script block logging (EID 4104)', 'File analysis (entropy)', 'Process creation (encoded arguments)'],
    sigmaGuidance: 'Activer Script Block Logging PowerShell. Détecter les chaînes Base64 longues dans les arguments de commande. Sigma: posh_ps_suspicious_script_block_logging.',
    detectionPriority: 'high',
  },
  'T1055': {
    mitigations: ['M1040', 'M1026'],
    dataSources: ['Sysmon EID 8 (CreateRemoteThread)', 'Sysmon EID 10 (ProcessAccess)', 'API monitoring'],
    sigmaGuidance: 'Monitorer Sysmon EID 8 (CreateRemoteThread) et EID 10 (ProcessAccess) vers des processus sensibles comme lsass.exe, explorer.exe. Sigma: sysmon_crt_*.',
    detectionPriority: 'critical',
  },
  'T1218': {
    mitigations: ['M1038', 'M1040'],
    dataSources: ['Process creation (Sysmon EID 1)', 'Loaded DLLs (Sysmon EID 7)'],
    sigmaGuidance: 'Détecter l\'utilisation de LOLBins : mshta, rundll32, regsvr32, certutil, wmic pour exécuter du code. Sigma: proc_creation_win_lolbin_*.',
    detectionPriority: 'critical',
  },

  // ── Credential Access ──
  'T1003': {
    mitigations: ['M1026', 'M1028', 'M1040', 'M1017', 'M1043'],
    dataSources: ['Sysmon EID 10 (ProcessAccess to lsass.exe)', 'Security Event 4656/4663', 'Windows Defender Credential Guard'],
    sigmaGuidance: 'Règle critique : Sysmon EID 10 avec TargetImage=lsass.exe et GrantedAccess contenant 0x1010/0x1410/0x1f1fff. C\'est la détection Mimikatz de base.',
    detectionPriority: 'critical',
  },
  'T1003.001': {
    mitigations: ['M1026', 'M1028', 'M1040', 'M1043'],
    dataSources: ['Sysmon EID 10 (TargetImage: lsass.exe)', 'Security Event 4656 (SAM access)', 'Credential Guard alerts'],
    sigmaGuidance: 'Sysmon EID 10 : TargetImage=*\\lsass.exe avec GrantedAccess in (0x1010, 0x1410, 0x147a, 0x1f1fff, 0x1f3fff). Sigma: sysmon_lsass_access.',
    detectionPriority: 'critical',
  },
  'T1110': {
    mitigations: ['M1032', 'M1027', 'M1036', 'M1018'],
    dataSources: ['Security Event 4625 (Failed logon)', 'Azure AD sign-in logs', 'Authentication server logs'],
    sigmaGuidance: 'Détecter >10 EID 4625 depuis la même IP en 10 minutes. Pour Azure AD : SignInLogs avec ResultType=50126 (invalid password) agrégé par IP.',
    detectionPriority: 'critical',
  },
  'T1110.003': {
    mitigations: ['M1032', 'M1027', 'M1036'],
    dataSources: ['Security Event 4625 (multiple accounts, same IP)', 'Azure AD sign-in logs'],
    sigmaGuidance: 'Password spraying : >5 EID 4625 avec des comptes DIFFÉRENTS depuis la même IP en 10 minutes. Sigma: win_security_password_spray.',
    detectionPriority: 'critical',
  },
  'T1558': {
    mitigations: ['M1027', 'M1015', 'M1026'],
    dataSources: ['Security Event 4769 (Kerberos service ticket)', 'Domain Controller logs'],
    sigmaGuidance: 'Kerberoasting : EID 4769 avec TicketEncryptionType=0x17 (RC4) et ServiceName ne commençant pas par krbtgt$. Sigma: win_security_kerberoasting.',
    detectionPriority: 'high',
  },
  'T1555': {
    mitigations: ['M1027', 'M1026'],
    dataSources: ['File access to browser credential stores', 'Process access to credential files'],
    sigmaGuidance: 'Surveiller les accès aux fichiers Login Data (Chrome), logins.json (Firefox), et les requêtes vers Credential Manager.',
    detectionPriority: 'high',
  },

  // ── Discovery ──
  'T1082': {
    mitigations: [],
    dataSources: ['Process creation (systeminfo, hostname, whoami)', 'Sysmon EID 1'],
    sigmaGuidance: 'Détecter l\'exécution séquentielle de commandes de reconnaissance : whoami, systeminfo, ipconfig, net user. Sigma: proc_creation_win_recon_commands.',
    detectionPriority: 'medium',
  },
  'T1083': {
    mitigations: [],
    dataSources: ['Process creation (dir, find, ls)', 'File access events'],
    sigmaGuidance: 'Surveiller les commandes dir/tree/Get-ChildItem sur de nombreux répertoires en peu de temps, surtout dans les partages réseau.',
    detectionPriority: 'low',
  },
  'T1016': {
    mitigations: [],
    dataSources: ['Process creation (ipconfig, ifconfig, route)', 'Sysmon EID 1'],
    sigmaGuidance: 'Détecter ipconfig /all, route print, arp -a, nslookup exécutés en séquence rapide. Sigma: proc_creation_win_network_recon.',
    detectionPriority: 'medium',
  },
  'T1046': {
    mitigations: ['M1030', 'M1031'],
    dataSources: ['Network flow logs', 'IDS/IPS alerts', 'Firewall logs (port scan patterns)'],
    sigmaGuidance: 'Détecter le scan de ports : >50 connexions SYN vers des ports différents depuis la même source en 60 secondes. Utiliser les logs Firewall/IDS.',
    detectionPriority: 'high',
  },
  'T1087': {
    mitigations: ['M1028'],
    dataSources: ['Process creation (net user, net group)', 'LDAP queries', 'AD enumeration tools'],
    sigmaGuidance: 'Monitorer net user /domain, net group "Domain Admins", et les requêtes LDAP suspectes (filtre sur objectCategory=person ou group). Sigma: proc_creation_win_ad_enum.',
    detectionPriority: 'medium',
  },

  // ── Lateral Movement ──
  'T1021': {
    mitigations: ['M1032', 'M1035', 'M1030', 'M1026'],
    dataSources: ['Security Event 4624 (Network logon)', 'SMB session logs', 'RDP connection logs'],
    sigmaGuidance: 'Monitorer EID 4624 LogonType 3 (Network) et 10 (RemoteInteractive/RDP) depuis des machines sources inhabituelles. Corréler avec les flux réseau.',
    detectionPriority: 'high',
  },
  'T1021.001': {
    mitigations: ['M1032', 'M1035', 'M1030', 'M1026'],
    dataSources: ['Security Event 4624 LogonType 10', 'RDP Client Connection (EID 1024)', 'Network flow (port 3389)'],
    sigmaGuidance: 'Détecter les connexions RDP depuis des machines non-admin, vers des serveurs sensibles, ou en dehors des heures de bureau. Sigma: win_security_rdp_*.',
    detectionPriority: 'high',
  },
  'T1021.002': {
    mitigations: ['M1035', 'M1030', 'M1026', 'M1028'],
    dataSources: ['Security Event 4624 LogonType 3', 'SMB share access (EID 5140)', 'Service creation on remote hosts'],
    sigmaGuidance: 'Détecter PsExec : EID 7045 (nouveau service PSEXESVC) + EID 4624 LogonType 3 NTLM. Sigma: win_security_psexec_service.',
    detectionPriority: 'high',
  },
  'T1550': {
    mitigations: ['M1026', 'M1032', 'M1018'],
    dataSources: ['Security Event 4624 (NTLM authentication)', 'Kerberos ticket events (4768, 4769)'],
    sigmaGuidance: 'Pass-the-Hash : EID 4624 avec LogonType 9 (NewCredentials) ou NTLM utilisé quand Kerberos est attendu. Pass-the-Ticket : TGT/TGS anormaux.',
    detectionPriority: 'critical',
  },
  'T1570': {
    mitigations: ['M1037', 'M1031', 'M1030'],
    dataSources: ['SMB file transfer logs', 'Admin$ share access', 'Network flow analysis'],
    sigmaGuidance: 'Surveiller les transferts de fichiers exécutables via SMB/admin shares. Monitorer EID 5140/5145 pour les accès à ADMIN$ et C$.',
    detectionPriority: 'high',
  },

  // ── Collection ──
  'T1074': {
    mitigations: ['M1022'],
    dataSources: ['File creation events (large archives)', 'Process creation (rar, 7z, zip)'],
    sigmaGuidance: 'Détecter la création de fichiers .zip/.rar/.7z dans des dossiers temporaires, surtout contenant des fichiers de données. Sigma: file_event_win_staging.',
    detectionPriority: 'medium',
  },
  'T1113': {
    mitigations: [],
    dataSources: ['API monitoring (GDI32 screen capture)', 'Process access to display devices'],
    sigmaGuidance: 'Surveiller les processus non-standards qui appellent les API de capture d\'écran (BitBlt, PrintWindow). Peu de sources Sigma existantes.',
    detectionPriority: 'low',
  },
  'T1056': {
    mitigations: [],
    dataSources: ['API monitoring (SetWindowsHookEx)', 'Process loading of hook DLLs'],
    sigmaGuidance: 'Détecter les appels à SetWindowsHookEx avec WH_KEYBOARD_LL depuis des processus non-standards. Monitoring via Sysmon ou EDR.',
    detectionPriority: 'medium',
  },

  // ── Exfiltration ──
  'T1041': {
    mitigations: ['M1031', 'M1037', 'M1057'],
    dataSources: ['Network traffic analysis', 'DLP alerts', 'Proxy logs (large uploads)'],
    sigmaGuidance: 'Surveiller les uploads sortants volumineux (>10MB) via HTTP/HTTPS vers des domaines non-catégorisés. Corréler avec les alertes DLP.',
    detectionPriority: 'high',
  },
  'T1048': {
    mitigations: ['M1031', 'M1037', 'M1057'],
    dataSources: ['DNS query logs (long queries = DNS tunneling)', 'Network flow (unusual protocols)', 'Firewall logs'],
    sigmaGuidance: 'DNS exfiltration : détecter les requêtes DNS avec des sous-domaines >50 caractères ou >500 requêtes/heure vers un même domaine.',
    detectionPriority: 'high',
  },
  'T1567': {
    mitigations: ['M1021', 'M1057'],
    dataSources: ['Proxy logs (uploads to cloud storage)', 'CASB alerts', 'DLP'],
    sigmaGuidance: 'Surveiller les uploads vers mega.nz, transfer.sh, anonfiles.com, wetransfer.com, ou tout service non-approuvé par l\'organisation.',
    detectionPriority: 'high',
  },
  'T1567.002': {
    mitigations: ['M1021', 'M1057'],
    dataSources: ['Proxy logs (PUT/POST to cloud storage APIs)', 'CASB (Netskope, Zscaler)', 'DLP alerts'],
    sigmaGuidance: 'Détecter les uploads vers des services cloud personnels (Dropbox, OneDrive personnel) via les logs proxy. Filtrer sur les méthodes PUT/POST >5MB.',
    detectionPriority: 'high',
  },

  // ── Command and Control ──
  'T1071': {
    mitigations: ['M1031', 'M1030', 'M1020'],
    dataSources: ['Proxy logs', 'DNS logs', 'Network flow analysis', 'TLS/JA3 fingerprinting'],
    sigmaGuidance: 'Détecter les beacons C2 : connexions HTTP/HTTPS périodiques (intervalle fixe ±jitter) vers des domaines à faible réputation. Analyser les JA3 fingerprints.',
    detectionPriority: 'critical',
  },
  'T1071.001': {
    mitigations: ['M1031', 'M1030', 'M1020'],
    dataSources: ['Proxy logs (HTTP/HTTPS)', 'User-Agent analysis', 'TLS certificate analysis'],
    sigmaGuidance: 'Surveiller les User-Agents inhabituels, les connexions HTTPS vers des IPs (pas de domaine), et les certificats auto-signés ou Let\'s Encrypt récents.',
    detectionPriority: 'critical',
  },
  'T1573': {
    mitigations: ['M1031', 'M1020'],
    dataSources: ['TLS inspection logs', 'JA3/JA3S fingerprinting', 'Network flow (encrypted traffic to unusual ports)'],
    sigmaGuidance: 'Identifier les communications chiffrées non-standards : TLS sur des ports inhabituels (not 443), JA3 fingerprints connus de malware (Cobalt Strike, Metasploit).',
    detectionPriority: 'high',
  },
  'T1090': {
    mitigations: ['M1031', 'M1037'],
    dataSources: ['Network flow analysis', 'Proxy logs', 'Tor exit node lists'],
    sigmaGuidance: 'Détecter les connexions vers des nœuds Tor connus, ou l\'utilisation de proxys SOCKS. Monitorer les processus qui établissent des tunnels (ssh, plink, chisel).',
    detectionPriority: 'high',
  },
  'T1572': {
    mitigations: ['M1037', 'M1031'],
    dataSources: ['Network traffic (tunneled protocols)', 'DNS over HTTPS detection', 'Process creation (ssh, plink)'],
    sigmaGuidance: 'Détecter les tunnels : SSH avec port forwarding (-L, -R, -D), DNS over HTTPS vers des résolveurs externes, ICMP tunneling.',
    detectionPriority: 'high',
  },

  // ── Impact ──
  'T1486': {
    mitigations: ['M1053', 'M1040', 'M1049'],
    dataSources: ['File modification events (mass rename)', 'VSS events', 'Process creation (ransomware indicators)'],
    sigmaGuidance: 'Détecter la modification massive de fichiers (>100 fichiers renommés en <1 minute), la suppression de shadow copies, et les notes de rançon. Sigma: file_event_win_ransomware_*.',
    detectionPriority: 'critical',
  },
  'T1490': {
    mitigations: ['M1053', 'M1028'],
    dataSources: ['Process creation (vssadmin, wmic, bcdedit)', 'PowerShell script block logging'],
    sigmaGuidance: 'Règle simple : détecter "vssadmin delete shadows", "wmic shadowcopy delete", "bcdedit /set recoveryenabled no". Sigma: proc_creation_win_shadow_copy_deletion.',
    detectionPriority: 'critical',
  },
  'T1489': {
    mitigations: ['M1030', 'M1022', 'M1024'],
    dataSources: ['Service control events (7036)', 'Process creation (net stop, sc stop)'],
    sigmaGuidance: 'Monitorer l\'arrêt de services critiques : SQL, Exchange, backup, antivirus via "net stop" ou "sc stop". Sigma: proc_creation_win_service_stop.',
    detectionPriority: 'high',
  },
  'T1485': {
    mitigations: ['M1053'],
    dataSources: ['File deletion events', 'Disk wipe tool detection', 'MBR modification alerts'],
    sigmaGuidance: 'Détecter les outils de destruction (cipher /w, sdelete, shred) et les accès directs au disque (PhysicalDrive0). Sigma: proc_creation_win_disk_wipe.',
    detectionPriority: 'critical',
  },
  'T1499': {
    mitigations: ['M1037'],
    dataSources: ['Network traffic analysis', 'Web server logs', 'Load balancer metrics'],
    sigmaGuidance: 'Monitorer les pics de trafic anormaux, les requêtes HTTP/HTTPS depuis des sources multiples, et les alertes WAF de type flood/DDoS.',
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
    dataSources: ['Logs système', 'Trafic réseau'],
    sigmaGuidance: `Aucune guidance Sigma spécifique pour ${techniqueId}. Consultez https://attack.mitre.org/techniques/${techniqueId.replace('.', '/')}/`,
    detectionPriority: 'medium',
    _fallback: true,
  };
}
