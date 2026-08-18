// ============================================================
// Attack Scenarios — pre-built kill chains for tracked APT groups
// Each step = tactic → technique, color-coded by live coverage
// ============================================================

export const ATTACK_SCENARIOS = [
  {
    id: 'apt28-spearphishing-espionage',
    name: 'Spearphishing to Espionage',
    description: 'Classic APT28 chain: lure the user with a phishing email, execute via PowerShell, persist on the host, dump credentials and exfiltrate over the C2 channel.',
    actorId: 'apt28',
    steps: [
      { tactic: 'TA0001', techniqueId: 'T1566.001', label: 'Spearphishing Attachment' },
      { tactic: 'TA0002', techniqueId: 'T1059.001', label: 'PowerShell' },
      { tactic: 'TA0003', techniqueId: 'T1547.001', label: 'Registry Run Keys' },
      { tactic: 'TA0006', techniqueId: 'T1003.001', label: 'LSASS Memory Dump' },
      { tactic: 'TA0011', techniqueId: 'T1071.001', label: 'C2 over Web Protocols' },
      { tactic: 'TA0010', techniqueId: 'T1041', label: 'Exfiltration over C2' },
    ],
  },
  {
    id: 'apt29-supply-chain',
    name: 'Supply Chain Intrusion',
    description: 'APT29 / Midnight Blizzard style: compromise a trusted vendor, move laterally with stolen credentials and tunnel out through cloud services.',
    actorId: 'apt29',
    steps: [
      { tactic: 'TA0001', techniqueId: 'T1195', label: 'Supply Chain Compromise' },
      { tactic: 'TA0002', techniqueId: 'T1059.001', label: 'PowerShell' },
      { tactic: 'TA0008', techniqueId: 'T1550.002', label: 'Pass the Hash' },
      { tactic: 'TA0008', techniqueId: 'T1021.001', label: 'Remote Desktop Protocol' },
      { tactic: 'TA0010', techniqueId: 'T1567.002', label: 'Exfiltration to Cloud' },
    ],
  },
  {
    id: 'apt41-exploit-data-theft',
    name: 'Exploiting the Edge for Data Theft',
    description: 'APT41 pattern: break in through a public-facing application, inject into trusted processes, plant a service backdoor and steal data across the network.',
    actorId: 'apt41',
    steps: [
      { tactic: 'TA0001', techniqueId: 'T1190', label: 'Exploit Public-Facing App' },
      { tactic: 'TA0004', techniqueId: 'T1055', label: 'Process Injection' },
      { tactic: 'TA0003', techniqueId: 'T1543.003', label: 'Windows Service Backdoor' },
      { tactic: 'TA0008', techniqueId: 'T1021.002', label: 'SMB / Admin Shares' },
      { tactic: 'TA0010', techniqueId: 'T1041', label: 'Exfiltration over C2' },
    ],
  },
  {
    id: 'scattered-spider-identity-ransom',
    name: 'Identity Compromise to Ransomware',
    description: 'Scattered Spider playbook: socially engineer IT support, take over valid accounts, steal session tokens and encrypt the environment for extortion.',
    actorId: 'scattered-spider',
    steps: [
      { tactic: 'TA0001', techniqueId: 'T1566.002', label: 'Spearphishing Link' },
      { tactic: 'TA0001', techniqueId: 'T1078.004', label: 'Cloud Accounts' },
      { tactic: 'TA0006', techniqueId: 'T1528', label: 'Steal Access Token' },
      { tactic: 'TA0006', techniqueId: 'T1556', label: 'Modify Auth Process' },
      { tactic: 'TA0010', techniqueId: 'T1537', label: 'Transfer Data to Cloud' },
      { tactic: 'TA0040', techniqueId: 'T1486', label: 'Data Encrypted for Impact' },
    ],
  },
  {
    id: 'lockbit-double-extortion',
    name: 'Ransomware Double Extortion',
    description: 'LockBit RaaS chain: gain initial access via exposed services or phishing, spray credentials, deploy ransomware across the fleet and exfiltrate data before encrypting.',
    actorId: 'lockbit',
    steps: [
      { tactic: 'TA0001', techniqueId: 'T1133', label: 'External Remote Services' },
      { tactic: 'TA0006', techniqueId: 'T1110.003', label: 'Password Spraying' },
      { tactic: 'TA0002', techniqueId: 'T1059.001', label: 'PowerShell' },
      { tactic: 'TA0008', techniqueId: 'T1021.001', label: 'Remote Desktop Protocol' },
      { tactic: 'TA0040', techniqueId: 'T1486', label: 'Data Encrypted for Impact' },
      { tactic: 'TA0040', techniqueId: 'T1490', label: 'Inhibit System Recovery' },
    ],
  },
];
