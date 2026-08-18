// ============================================================
// ATT&CK Enterprise Data — Curated & Lightweight
// Source: MITRE ATT&CK Enterprise v15 (simplified for browser)
// ============================================================

export const TACTICS = [
  { id: "TA0001", name: "Initial Access", shortName: "initial-access", order: 1 },
  { id: "TA0002", name: "Execution", shortName: "execution", order: 2 },
  { id: "TA0003", name: "Persistence", shortName: "persistence", order: 3 },
  { id: "TA0004", name: "Privilege Escalation", shortName: "privilege-escalation", order: 4 },
  { id: "TA0005", name: "Defense Evasion", shortName: "defense-evasion", order: 5 },
  { id: "TA0006", name: "Credential Access", shortName: "credential-access", order: 6 },
  { id: "TA0007", name: "Discovery", shortName: "discovery", order: 7 },
  { id: "TA0008", name: "Lateral Movement", shortName: "lateral-movement", order: 8 },
  { id: "TA0009", name: "Collection", shortName: "collection", order: 9 },
  { id: "TA0010", name: "Exfiltration", shortName: "exfiltration", order: 10 },
  { id: "TA0011", name: "Command and Control", shortName: "command-and-control", order: 11 },
  { id: "TA0040", name: "Impact", shortName: "impact", order: 12 },
];

export const TECHNIQUES = [
  // ---- Initial Access ----
  { id: "T1566", name: "Phishing", tactic: "TA0001", platforms: ["Linux","macOS","Windows"], prevalence: 95 },
  { id: "T1566.001", name: "Spearphishing Attachment", tactic: "TA0001", platforms: ["Linux","macOS","Windows"], prevalence: 90, parent: "T1566" },
  { id: "T1566.002", name: "Spearphishing Link", tactic: "TA0001", platforms: ["Linux","macOS","Windows"], prevalence: 88, parent: "T1566" },
  { id: "T1566.003", name: "Spearphishing via Service", tactic: "TA0001", platforms: ["Linux","macOS","Windows"], prevalence: 65, parent: "T1566" },
  { id: "T1190", name: "Exploit Public-Facing Application", tactic: "TA0001", platforms: ["Linux","macOS","Windows","Network","Containers"], prevalence: 85 },
  { id: "T1133", name: "External Remote Services", tactic: "TA0001", platforms: ["Linux","macOS","Windows"], prevalence: 80 },
  { id: "T1078", name: "Valid Accounts", tactic: "TA0001", platforms: ["Linux","macOS","Windows","SaaS","IaaS","Office 365","Azure AD"], prevalence: 90 },
  { id: "T1078.001", name: "Default Accounts", tactic: "TA0001", platforms: ["Linux","macOS","Windows"], prevalence: 70, parent: "T1078" },
  { id: "T1078.003", name: "Local Accounts", tactic: "TA0001", platforms: ["Linux","macOS","Windows"], prevalence: 75, parent: "T1078" },
  { id: "T1078.004", name: "Cloud Accounts", tactic: "TA0001", platforms: ["SaaS","IaaS","Azure AD"], prevalence: 78, parent: "T1078" },
  { id: "T1195", name: "Supply Chain Compromise", tactic: "TA0001", platforms: ["Linux","macOS","Windows"], prevalence: 60 },
  { id: "T1091", name: "Replication Through Removable Media", tactic: "TA0001", platforms: ["Windows"], prevalence: 40 },
  { id: "T1200", name: "Hardware Additions", tactic: "TA0001", platforms: ["Linux","macOS","Windows"], prevalence: 30 },
  { id: "T1189", name: "Drive-by Compromise", tactic: "TA0001", platforms: ["Linux","macOS","Windows"], prevalence: 65 },
  { id: "T1659", name: "Content Injection", tactic: "TA0001", platforms: ["Linux","macOS","Windows"], prevalence: 50 },

  // ---- Execution ----
  { id: "T1059", name: "Command and Scripting Interpreter", tactic: "TA0002", platforms: ["Linux","macOS","Windows"], prevalence: 98 },
  { id: "T1059.001", name: "PowerShell", tactic: "TA0002", platforms: ["Windows"], prevalence: 95, parent: "T1059" },
  { id: "T1059.003", name: "Windows Command Shell", tactic: "TA0002", platforms: ["Windows"], prevalence: 90, parent: "T1059" },
  { id: "T1059.004", name: "Unix Shell", tactic: "TA0002", platforms: ["Linux","macOS"], prevalence: 85, parent: "T1059" },
  { id: "T1059.006", name: "Python", tactic: "TA0002", platforms: ["Linux","macOS","Windows"], prevalence: 70, parent: "T1059" },
  { id: "T1059.007", name: "JavaScript", tactic: "TA0002", platforms: ["Linux","macOS","Windows"], prevalence: 65, parent: "T1059" },
  { id: "T1204", name: "User Execution", tactic: "TA0002", platforms: ["Linux","macOS","Windows"], prevalence: 85 },
  { id: "T1204.001", name: "Malicious Link", tactic: "TA0002", platforms: ["Linux","macOS","Windows"], prevalence: 80, parent: "T1204" },
  { id: "T1204.002", name: "Malicious File", tactic: "TA0002", platforms: ["Linux","macOS","Windows"], prevalence: 82, parent: "T1204" },
  { id: "T1053", name: "Scheduled Task/Job", tactic: "TA0002", platforms: ["Linux","macOS","Windows"], prevalence: 80 },
  { id: "T1053.005", name: "Scheduled Task", tactic: "TA0002", platforms: ["Windows"], prevalence: 78, parent: "T1053" },
  { id: "T1053.003", name: "Cron", tactic: "TA0002", platforms: ["Linux","macOS"], prevalence: 65, parent: "T1053" },
  { id: "T1047", name: "Windows Management Instrumentation", tactic: "TA0002", platforms: ["Windows"], prevalence: 75 },
  { id: "T1569", name: "System Services", tactic: "TA0002", platforms: ["Linux","macOS","Windows"], prevalence: 70 },
  { id: "T1569.002", name: "Service Execution", tactic: "TA0002", platforms: ["Windows"], prevalence: 68, parent: "T1569" },
  { id: "T1106", name: "Native API", tactic: "TA0002", platforms: ["Linux","macOS","Windows"], prevalence: 72 },
  { id: "T1203", name: "Exploitation for Client Execution", tactic: "TA0002", platforms: ["Linux","macOS","Windows"], prevalence: 65 },

  // ---- Persistence ----
  { id: "T1547", name: "Boot or Logon Autostart Execution", tactic: "TA0003", platforms: ["Linux","macOS","Windows"], prevalence: 82 },
  { id: "T1547.001", name: "Registry Run Keys / Startup Folder", tactic: "TA0003", platforms: ["Windows"], prevalence: 80, parent: "T1547" },
  { id: "T1543", name: "Create or Modify System Process", tactic: "TA0003", platforms: ["Linux","macOS","Windows"], prevalence: 75 },
  { id: "T1543.003", name: "Windows Service", tactic: "TA0003", platforms: ["Windows"], prevalence: 72, parent: "T1543" },
  { id: "T1098", name: "Account Manipulation", tactic: "TA0003", platforms: ["Linux","macOS","Windows","Azure AD","Office 365","SaaS"], prevalence: 78 },
  { id: "T1136", name: "Create Account", tactic: "TA0003", platforms: ["Linux","macOS","Windows","Azure AD","Office 365"], prevalence: 72 },
  { id: "T1136.001", name: "Local Account", tactic: "TA0003", platforms: ["Linux","macOS","Windows"], prevalence: 70, parent: "T1136" },
  { id: "T1505", name: "Server Software Component", tactic: "TA0003", platforms: ["Linux","macOS","Windows","Network"], prevalence: 65 },
  { id: "T1505.003", name: "Web Shell", tactic: "TA0003", platforms: ["Linux","macOS","Windows"], prevalence: 68, parent: "T1505" },
  { id: "T1053.005", name: "Scheduled Task (Persist)", tactic: "TA0003", platforms: ["Windows"], prevalence: 78, parent: "T1053" },
  { id: "T1574", name: "Hijack Execution Flow", tactic: "TA0003", platforms: ["Linux","macOS","Windows"], prevalence: 62 },

  // ---- Privilege Escalation ----
  { id: "T1548", name: "Abuse Elevation Control Mechanism", tactic: "TA0004", platforms: ["Linux","macOS","Windows"], prevalence: 78 },
  { id: "T1548.002", name: "Bypass User Account Control", tactic: "TA0004", platforms: ["Windows"], prevalence: 75, parent: "T1548" },
  { id: "T1068", name: "Exploitation for Privilege Escalation", tactic: "TA0004", platforms: ["Linux","macOS","Windows"], prevalence: 70 },
  { id: "T1055", name: "Process Injection", tactic: "TA0004", platforms: ["Linux","macOS","Windows"], prevalence: 80 },
  { id: "T1055.001", name: "Dynamic-link Library Injection", tactic: "TA0004", platforms: ["Windows"], prevalence: 75, parent: "T1055" },
  { id: "T1055.003", name: "Thread Execution Hijacking", tactic: "TA0004", platforms: ["Windows"], prevalence: 60, parent: "T1055" },
  { id: "T1134", name: "Access Token Manipulation", tactic: "TA0004", platforms: ["Windows"], prevalence: 68 },
  { id: "T1611", name: "Escape to Host", tactic: "TA0004", platforms: ["Containers","Linux"], prevalence: 55 },
  { id: "T1078", name: "Valid Accounts (PrivEsc)", tactic: "TA0004", platforms: ["Linux","macOS","Windows"], prevalence: 82 },

  // ---- Defense Evasion ----
  { id: "T1562", name: "Impair Defenses", tactic: "TA0005", platforms: ["Linux","macOS","Windows"], prevalence: 88 },
  { id: "T1562.001", name: "Disable or Modify Tools", tactic: "TA0005", platforms: ["Linux","macOS","Windows"], prevalence: 85, parent: "T1562" },
  { id: "T1562.004", name: "Disable or Modify System Firewall", tactic: "TA0005", platforms: ["Linux","macOS","Windows"], prevalence: 72, parent: "T1562" },
  { id: "T1070", name: "Indicator Removal", tactic: "TA0005", platforms: ["Linux","macOS","Windows","Network"], prevalence: 82 },
  { id: "T1070.001", name: "Clear Windows Event Logs", tactic: "TA0005", platforms: ["Windows"], prevalence: 80, parent: "T1070" },
  { id: "T1070.004", name: "File Deletion", tactic: "TA0005", platforms: ["Linux","macOS","Windows"], prevalence: 78, parent: "T1070" },
  { id: "T1036", name: "Masquerading", tactic: "TA0005", platforms: ["Linux","macOS","Windows"], prevalence: 80 },
  { id: "T1036.005", name: "Match Legitimate Name or Location", tactic: "TA0005", platforms: ["Linux","macOS","Windows"], prevalence: 75, parent: "T1036" },
  { id: "T1027", name: "Obfuscated Files or Information", tactic: "TA0005", platforms: ["Linux","macOS","Windows"], prevalence: 85 },
  { id: "T1027.001", name: "Binary Padding", tactic: "TA0005", platforms: ["Linux","macOS","Windows"], prevalence: 60, parent: "T1027" },
  { id: "T1218", name: "System Binary Proxy Execution", tactic: "TA0005", platforms: ["Windows"], prevalence: 78 },
  { id: "T1218.011", name: "Rundll32", tactic: "TA0005", platforms: ["Windows"], prevalence: 75, parent: "T1218" },
  { id: "T1112", name: "Modify Registry", tactic: "TA0005", platforms: ["Windows"], prevalence: 72 },
  { id: "T1553", name: "Subvert Trust Controls", tactic: "TA0005", platforms: ["Linux","macOS","Windows"], prevalence: 65 },
  { id: "T1497", name: "Virtualization/Sandbox Evasion", tactic: "TA0005", platforms: ["Linux","macOS","Windows"], prevalence: 70 },
  { id: "T1055.012", name: "Process Hollowing", tactic: "TA0005", platforms: ["Windows"], prevalence: 65 },

  // ---- Credential Access ----
  { id: "T1110", name: "Brute Force", tactic: "TA0006", platforms: ["Linux","macOS","Windows","Azure AD","Office 365","SaaS"], prevalence: 85 },
  { id: "T1110.001", name: "Password Guessing", tactic: "TA0006", platforms: ["Linux","macOS","Windows"], prevalence: 80, parent: "T1110" },
  { id: "T1110.003", name: "Password Spraying", tactic: "TA0006", platforms: ["Linux","macOS","Windows","Azure AD"], prevalence: 82, parent: "T1110" },
  { id: "T1003", name: "OS Credential Dumping", tactic: "TA0006", platforms: ["Linux","macOS","Windows"], prevalence: 88 },
  { id: "T1003.001", name: "LSASS Memory", tactic: "TA0006", platforms: ["Windows"], prevalence: 85, parent: "T1003" },
  { id: "T1555", name: "Credentials from Password Stores", tactic: "TA0006", platforms: ["Linux","macOS","Windows"], prevalence: 75 },
  { id: "T1539", name: "Steal Web Session Cookie", tactic: "TA0006", platforms: ["Linux","macOS","Windows"], prevalence: 70 },
  { id: "T1528", name: "Steal Application Access Token", tactic: "TA0006", platforms: ["Azure AD","Office 365","SaaS"], prevalence: 72 },
  { id: "T1557", name: "Adversary-in-the-Middle", tactic: "TA0006", platforms: ["Linux","macOS","Windows","Network"], prevalence: 68 },
  { id: "T1558", name: "Steal or Forge Kerberos Tickets", tactic: "TA0006", platforms: ["Windows"], prevalence: 72 },
  { id: "T1558.003", name: "Kerberoasting", tactic: "TA0006", platforms: ["Windows"], prevalence: 70, parent: "T1558" },
  { id: "T1556", name: "Modify Authentication Process", tactic: "TA0006", platforms: ["Linux","macOS","Windows","Azure AD","Network"], prevalence: 65 },

  // ---- Discovery ----
  { id: "T1082", name: "System Information Discovery", tactic: "TA0007", platforms: ["Linux","macOS","Windows"], prevalence: 90 },
  { id: "T1083", name: "File and Directory Discovery", tactic: "TA0007", platforms: ["Linux","macOS","Windows"], prevalence: 88 },
  { id: "T1033", name: "System Owner/User Discovery", tactic: "TA0007", platforms: ["Linux","macOS","Windows"], prevalence: 85 },
  { id: "T1057", name: "Process Discovery", tactic: "TA0007", platforms: ["Linux","macOS","Windows"], prevalence: 85 },
  { id: "T1016", name: "System Network Configuration Discovery", tactic: "TA0007", platforms: ["Linux","macOS","Windows"], prevalence: 82 },
  { id: "T1046", name: "Network Service Discovery", tactic: "TA0007", platforms: ["Linux","macOS","Windows","Containers"], prevalence: 80 },
  { id: "T1069", name: "Permission Groups Discovery", tactic: "TA0007", platforms: ["Linux","macOS","Windows","Azure AD","Office 365","SaaS"], prevalence: 78 },
  { id: "T1087", name: "Account Discovery", tactic: "TA0007", platforms: ["Linux","macOS","Windows","Azure AD","Office 365"], prevalence: 80 },
  { id: "T1135", name: "Network Share Discovery", tactic: "TA0007", platforms: ["Linux","macOS","Windows"], prevalence: 75 },
  { id: "T1201", name: "Password Policy Discovery", tactic: "TA0007", platforms: ["Linux","macOS","Windows"], prevalence: 70 },
  { id: "T1526", name: "Cloud Service Discovery", tactic: "TA0007", platforms: ["Azure AD","Office 365","SaaS","IaaS"], prevalence: 68 },
  { id: "T1518", name: "Software Discovery", tactic: "TA0007", platforms: ["Linux","macOS","Windows"], prevalence: 72 },
  { id: "T1580", name: "Cloud Infrastructure Discovery", tactic: "TA0007", platforms: ["IaaS"], prevalence: 65 },

  // ---- Lateral Movement ----
  { id: "T1021", name: "Remote Services", tactic: "TA0008", platforms: ["Linux","macOS","Windows"], prevalence: 85 },
  { id: "T1021.001", name: "Remote Desktop Protocol", tactic: "TA0008", platforms: ["Windows"], prevalence: 82, parent: "T1021" },
  { id: "T1021.002", name: "SMB/Windows Admin Shares", tactic: "TA0008", platforms: ["Windows"], prevalence: 78, parent: "T1021" },
  { id: "T1021.004", name: "SSH", tactic: "TA0008", platforms: ["Linux","macOS"], prevalence: 75, parent: "T1021" },
  { id: "T1021.006", name: "Windows Remote Management", tactic: "TA0008", platforms: ["Windows"], prevalence: 68, parent: "T1021" },
  { id: "T1550", name: "Use Alternate Authentication Material", tactic: "TA0008", platforms: ["Linux","macOS","Windows"], prevalence: 72 },
  { id: "T1550.002", name: "Pass the Hash", tactic: "TA0008", platforms: ["Windows"], prevalence: 70, parent: "T1550" },
  { id: "T1550.003", name: "Pass the Ticket", tactic: "TA0008", platforms: ["Windows"], prevalence: 65, parent: "T1550" },
  { id: "T1534", name: "Internal Spearphishing", tactic: "TA0008", platforms: ["Linux","macOS","Windows","Office 365","SaaS"], prevalence: 62 },
  { id: "T1570", name: "Lateral Tool Transfer", tactic: "TA0008", platforms: ["Linux","macOS","Windows"], prevalence: 72 },

  // ---- Collection ----
  { id: "T1560", name: "Archive Collected Data", tactic: "TA0009", platforms: ["Linux","macOS","Windows"], prevalence: 78 },
  { id: "T1114", name: "Email Collection", tactic: "TA0009", platforms: ["Linux","macOS","Windows","Office 365"], prevalence: 72 },
  { id: "T1056", name: "Input Capture", tactic: "TA0009", platforms: ["Linux","macOS","Windows","Network"], prevalence: 70 },
  { id: "T1056.001", name: "Keylogging", tactic: "TA0009", platforms: ["Linux","macOS","Windows"], prevalence: 68, parent: "T1056" },
  { id: "T1005", name: "Data from Local System", tactic: "TA0009", platforms: ["Linux","macOS","Windows"], prevalence: 80 },
  { id: "T1039", name: "Data from Network Shared Drive", tactic: "TA0009", platforms: ["Linux","macOS","Windows"], prevalence: 65 },
  { id: "T1025", name: "Data from Removable Media", tactic: "TA0009", platforms: ["Linux","macOS","Windows"], prevalence: 45 },
  { id: "T1113", name: "Screen Capture", tactic: "TA0009", platforms: ["Linux","macOS","Windows"], prevalence: 62 },
  { id: "T1074", name: "Data Staged", tactic: "TA0009", platforms: ["Linux","macOS","Windows","IaaS"], prevalence: 72 },
  { id: "T1602", name: "Data from Configuration Repository", tactic: "TA0009", platforms: ["Network"], prevalence: 55 },

  // ---- Exfiltration ----
  { id: "T1041", name: "Exfiltration Over C2 Channel", tactic: "TA0010", platforms: ["Linux","macOS","Windows"], prevalence: 82 },
  { id: "T1048", name: "Exfiltration Over Alternative Protocol", tactic: "TA0010", platforms: ["Linux","macOS","Windows"], prevalence: 72 },
  { id: "T1048.003", name: "Exfiltration Over Unencrypted Protocol", tactic: "TA0010", platforms: ["Linux","macOS","Windows"], prevalence: 65, parent: "T1048" },
  { id: "T1567", name: "Exfiltration Over Web Service", tactic: "TA0010", platforms: ["Linux","macOS","Windows"], prevalence: 75 },
  { id: "T1567.002", name: "Exfiltration to Cloud Storage", tactic: "TA0010", platforms: ["Linux","macOS","Windows"], prevalence: 72, parent: "T1567" },
  { id: "T1537", name: "Transfer Data to Cloud Account", tactic: "TA0010", platforms: ["IaaS","SaaS"], prevalence: 65 },
  { id: "T1011", name: "Exfiltration Over Other Network Medium", tactic: "TA0010", platforms: ["Linux","macOS","Windows"], prevalence: 50 },
  { id: "T1052", name: "Exfiltration Over Physical Medium", tactic: "TA0010", platforms: ["Linux","macOS","Windows"], prevalence: 35 },

  // ---- Command and Control ----
  { id: "T1071", name: "Application Layer Protocol", tactic: "TA0011", platforms: ["Linux","macOS","Windows","Network"], prevalence: 90 },
  { id: "T1071.001", name: "Web Protocols", tactic: "TA0011", platforms: ["Linux","macOS","Windows"], prevalence: 88, parent: "T1071" },
  { id: "T1071.004", name: "DNS", tactic: "TA0011", platforms: ["Linux","macOS","Windows"], prevalence: 78, parent: "T1071" },
  { id: "T1090", name: "Proxy", tactic: "TA0011", platforms: ["Linux","macOS","Windows","Network"], prevalence: 78 },
  { id: "T1090.003", name: "Multi-hop Proxy", tactic: "TA0011", platforms: ["Linux","macOS","Windows"], prevalence: 65, parent: "T1090" },
  { id: "T1572", name: "Protocol Tunneling", tactic: "TA0011", platforms: ["Linux","macOS","Windows"], prevalence: 70 },
  { id: "T1095", name: "Non-Application Layer Protocol", tactic: "TA0011", platforms: ["Linux","macOS","Windows","Network"], prevalence: 65 },
  { id: "T1102", name: "Web Service", tactic: "TA0011", platforms: ["Linux","macOS","Windows"], prevalence: 72 },
  { id: "T1573", name: "Encrypted Channel", tactic: "TA0011", platforms: ["Linux","macOS","Windows"], prevalence: 80 },
  { id: "T1573.002", name: "Asymmetric Cryptography", tactic: "TA0011", platforms: ["Linux","macOS","Windows"], prevalence: 72, parent: "T1573" },
  { id: "T1008", name: "Fallback Channels", tactic: "TA0011", platforms: ["Linux","macOS","Windows"], prevalence: 60 },
  { id: "T1219", name: "Remote Access Software", tactic: "TA0011", platforms: ["Linux","macOS","Windows"], prevalence: 75 },

  // ---- Impact ----
  { id: "T1486", name: "Data Encrypted for Impact", tactic: "TA0040", platforms: ["Linux","macOS","Windows","IaaS"], prevalence: 85 },
  { id: "T1490", name: "Inhibit System Recovery", tactic: "TA0040", platforms: ["Linux","macOS","Windows"], prevalence: 78 },
  { id: "T1489", name: "Service Stop", tactic: "TA0040", platforms: ["Linux","macOS","Windows"], prevalence: 72 },
  { id: "T1485", name: "Data Destruction", tactic: "TA0040", platforms: ["Linux","macOS","Windows","IaaS"], prevalence: 68 },
  { id: "T1499", name: "Endpoint Denial of Service", tactic: "TA0040", platforms: ["Linux","macOS","Windows"], prevalence: 62 },
  { id: "T1498", name: "Network Denial of Service", tactic: "TA0040", platforms: ["Linux","macOS","Windows","IaaS","Network"], prevalence: 58 },
  { id: "T1491", name: "Defacement", tactic: "TA0040", platforms: ["Linux","macOS","Windows","IaaS"], prevalence: 45 },
  { id: "T1561", name: "Disk Wipe", tactic: "TA0040", platforms: ["Linux","macOS","Windows"], prevalence: 55 },
  { id: "T1657", name: "Financial Theft", tactic: "TA0040", platforms: ["Linux","macOS","Windows","SaaS"], prevalence: 60 },
];

// Build lookup maps
// A technique may appear several times (once per tactic it maps to, e.g. T1078),
// so the by-ID maps keep the FIRST occurrence — the canonical name/description.
export const TECHNIQUE_MAP = {};
TECHNIQUES.forEach(t => { if (!TECHNIQUE_MAP[t.id]) TECHNIQUE_MAP[t.id] = t; });

// Dedupe a list of techniques by id — MITRE maps some techniques to several
// tactics (T1078 in Initial Access AND Privilege Escalation), keeping the first.
export function deduplicatedById(items) {
  const seen = new Set();
  return items.filter(t => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

export const TACTIC_MAP = {};
TACTICS.forEach(t => { TACTIC_MAP[t.id] = t; });

export const TECHNIQUES_BY_TACTIC = {};
TACTICS.forEach(tactic => {
  TECHNIQUES_BY_TACTIC[tactic.id] = TECHNIQUES.filter(
    t => t.tactic === tactic.id && !t.parent
  );
});

export const SUBTECHNIQUES_BY_PARENT = {};
TECHNIQUES.forEach(t => {
  if (t.parent) {
    if (!SUBTECHNIQUES_BY_PARENT[t.parent]) SUBTECHNIQUES_BY_PARENT[t.parent] = [];
    if (!SUBTECHNIQUES_BY_PARENT[t.parent].some(existing => existing.id === t.id)) {
      SUBTECHNIQUES_BY_PARENT[t.parent].push(t);
    }
  }
});
