// ============================================================
// Control → ATT&CK Technique Mappings (v2 — Expanded)
// Based on: MITRE ATT&CK Mitigations, CIS Controls v8, NIST 800-53
// Each control's coveredTechniques is derived from the MITRE
// mitigation objects that map to it (not manually guessed).
// ============================================================

export const CONTROL_CATEGORIES = [
  {
    id: 'email-security',
    name: 'Email Security',
    icon: '📧',
    description: 'Email gateways, anti-phishing, sandboxing',
    color: '#6366f1',
    controls: [
      {
        id: 'email-gateway',
        name: 'Secure Email Gateway (SEG)',
        type: 'preventive',
        coveredTechniques: [
          'T1566', 'T1566.001', 'T1566.002', 'T1566.003',
          'T1534', 'T1598', 'T1598.003',
          'T1204.001', 'T1204.002',
        ],
      },
      {
        id: 'anti-phishing',
        name: 'Anti-Phishing / DMARC/SPF/DKIM',
        type: 'preventive',
        coveredTechniques: [
          'T1566', 'T1566.002', 'T1598', 'T1598.003', 'T1534',
        ],
      },
      {
        id: 'email-sandboxing',
        name: 'Email Attachment Sandboxing',
        type: 'preventive',
        coveredTechniques: [
          'T1566.001', 'T1204.002', 'T1203',
          'T1059.001', 'T1059.003',
        ],
      },
    ],
  },
  {
    id: 'endpoint-security',
    name: 'Endpoint Security',
    icon: '💻',
    description: 'EDR, AV, application control, host hardening',
    color: '#8b5cf6',
    controls: [
      {
        id: 'edr',
        name: 'Endpoint Detection & Response (EDR)',
        type: 'detective',
        coveredTechniques: [
          // Execution
          'T1059', 'T1059.001', 'T1059.003', 'T1059.004', 'T1059.005', 'T1059.006', 'T1059.007',
          'T1204', 'T1204.001', 'T1204.002',
          'T1047', 'T1053', 'T1053.005', 'T1106', 'T1203', 'T1569', 'T1569.002',
          // Persistence
          'T1547', 'T1547.001', 'T1543', 'T1543.003', 'T1098', 'T1136', 'T1136.001',
          'T1505', 'T1505.003', 'T1574',
          // Privilege Escalation
          'T1055', 'T1055.001', 'T1055.003', 'T1055.012',
          'T1548', 'T1548.002', 'T1068', 'T1134',
          // Defense Evasion
          'T1562', 'T1562.001', 'T1070', 'T1070.001', 'T1070.004',
          'T1036', 'T1036.005', 'T1027', 'T1218', 'T1218.011',
          'T1112', 'T1553', 'T1497',
          // Credential Access
          'T1003', 'T1003.001', 'T1555', 'T1557',
          // Discovery (limited)
          'T1082', 'T1057',
          // Lateral Movement
          'T1570',
          // Impact
          'T1486', 'T1490', 'T1489', 'T1485',
        ],
      },
      {
        id: 'antivirus',
        name: 'Antivirus / Anti-Malware',
        type: 'preventive',
        coveredTechniques: [
          'T1059.001', 'T1059.003', 'T1204.002', 'T1203',
          'T1036.005', 'T1027', 'T1543.003',
          'T1486', 'T1485',
        ],
      },
      {
        id: 'app-whitelisting',
        name: 'Application Whitelisting / Control',
        type: 'preventive',
        coveredTechniques: [
          'T1059', 'T1059.001', 'T1059.003', 'T1059.005',
          'T1204.002', 'T1218', 'T1218.011',
          'T1553', 'T1574',
          'T1203',
        ],
      },
      {
        id: 'patch-management',
        name: 'Patch Management',
        type: 'preventive',
        coveredTechniques: [
          'T1190', 'T1068', 'T1203', 'T1611',
          'T1195', 'T1499',
        ],
      },
      {
        id: 'host-firewall',
        name: 'Host-Based Firewall',
        type: 'preventive',
        coveredTechniques: [
          'T1021.001', 'T1021.002', 'T1021.006',
          'T1047', 'T1049',
        ],
      },
    ],
  },
  {
    id: 'network-security',
    name: 'Network Security',
    icon: '🌐',
    description: 'Firewall, IDS/IPS, network segmentation, DNS filtering',
    color: '#0ea5e9',
    controls: [
      {
        id: 'ngfw',
        name: 'Next-Gen Firewall (NGFW)',
        type: 'preventive',
        coveredTechniques: [
          'T1071', 'T1071.001', 'T1071.004',
          'T1090', 'T1090.003', 'T1572',
          'T1095', 'T1219', 'T1133',
          'T1048', 'T1048.003', 'T1041',
        ],
      },
      {
        id: 'ids-ips',
        name: 'IDS / IPS',
        type: 'detective',
        coveredTechniques: [
          'T1046', 'T1071.004', 'T1095', 'T1557',
          'T1498', 'T1499',
          'T1021.001', 'T1021.002',
          'T1090', 'T1572',
        ],
      },
      {
        id: 'network-segmentation',
        name: 'Network Segmentation / Micro-segmentation',
        type: 'preventive',
        coveredTechniques: [
          'T1021', 'T1021.001', 'T1021.002', 'T1021.004', 'T1021.006',
          'T1570', 'T1039', 'T1135',
          'T1550', 'T1550.002', 'T1550.003',
          'T1534',
        ],
      },
      {
        id: 'dns-filtering',
        name: 'DNS Filtering / Sinkholing',
        type: 'preventive',
        coveredTechniques: [
          'T1071.004', 'T1568', 'T1102', 'T1008',
          'T1566.002', 'T1048',
        ],
      },
      {
        id: 'ndr',
        name: 'Network Detection & Response (NDR)',
        type: 'detective',
        coveredTechniques: [
          'T1046', 'T1041', 'T1048', 'T1567',
          'T1071', 'T1090', 'T1572', 'T1219',
          'T1557', 'T1040',
          'T1021.001', 'T1021.002',
        ],
      },
      {
        id: 'vpn-ztna',
        name: 'VPN / Zero Trust Network Access',
        type: 'preventive',
        coveredTechniques: [
          'T1133', 'T1021.001', 'T1078', 'T1078.004',
        ],
      },
    ],
  },
  {
    id: 'identity-access',
    name: 'Identity & Access Management',
    icon: '🔐',
    description: 'MFA, PAM, conditional access, IAM',
    color: '#f59e0b',
    controls: [
      {
        id: 'mfa',
        name: 'Multi-Factor Authentication (MFA)',
        type: 'preventive',
        coveredTechniques: [
          'T1078', 'T1078.001', 'T1078.003', 'T1078.004',
          'T1110', 'T1110.001', 'T1110.003', 'T1110.004',
          'T1021.001', 'T1133',
          'T1556', 'T1539',
        ],
      },
      {
        id: 'pam',
        name: 'Privileged Access Management (PAM)',
        type: 'preventive',
        coveredTechniques: [
          'T1078', 'T1134', 'T1548', 'T1548.002',
          'T1021.001', 'T1021.006', 'T1047',
          'T1003', 'T1550.002', 'T1550.003',
          'T1098',
        ],
      },
      {
        id: 'sso-idp',
        name: 'SSO / Identity Provider (IdP)',
        type: 'preventive',
        coveredTechniques: [
          'T1078.004', 'T1528', 'T1556',
          'T1110.003', 'T1539',
        ],
      },
      {
        id: 'conditional-access',
        name: 'Conditional Access Policies',
        type: 'preventive',
        coveredTechniques: [
          'T1078.004', 'T1110', 'T1539', 'T1528',
          'T1133',
        ],
      },
    ],
  },
  {
    id: 'siem-monitoring',
    name: 'SIEM & Monitoring',
    icon: '📊',
    description: 'SIEM, UEBA, log management, SOC operations',
    color: '#10b981',
    controls: [
      {
        id: 'siem',
        name: 'SIEM Platform',
        type: 'detective',
        coveredTechniques: [
          // Authentication & Accounts
          'T1078', 'T1110', 'T1110.003', 'T1136', 'T1136.001',
          'T1098',
          // Credential Access
          'T1003', 'T1003.001', 'T1558', 'T1558.003',
          // Execution
          'T1059.001', 'T1053.005', 'T1047',
          // Persistence
          'T1547.001', 'T1543.003',
          // Defense Evasion
          'T1070.001', 'T1562.001',
          // Lateral Movement
          'T1021.001', 'T1021.002', 'T1550.002',
          // Impact
          'T1486', 'T1490',
        ],
      },
      {
        id: 'ueba',
        name: 'User & Entity Behavior Analytics (UEBA)',
        type: 'detective',
        coveredTechniques: [
          'T1078', 'T1087', 'T1069', 'T1083',
          'T1539', 'T1528', 'T1114',
          'T1133',
        ],
      },
      {
        id: 'log-aggregation',
        name: 'Centralized Log Management',
        type: 'detective',
        coveredTechniques: [
          'T1070', 'T1070.001', 'T1070.004', 'T1112',
          'T1562.001',
        ],
      },
      {
        id: 'soar',
        name: 'SOAR Platform',
        type: 'corrective',
        coveredTechniques: [
          'T1486', 'T1489', 'T1059.001', 'T1003',
          'T1566', 'T1078',
        ],
      },
    ],
  },
  {
    id: 'cloud-security',
    name: 'Cloud Security',
    icon: '☁️',
    description: 'CASB, CSPM, cloud workload protection, WAF',
    color: '#06b6d4',
    controls: [
      {
        id: 'casb',
        name: 'Cloud Access Security Broker (CASB)',
        type: 'detective',
        coveredTechniques: [
          'T1567.002', 'T1537', 'T1528', 'T1526',
          'T1078.004', 'T1048', 'T1114',
        ],
      },
      {
        id: 'cspm',
        name: 'Cloud Security Posture Management (CSPM)',
        type: 'detective',
        coveredTechniques: [
          'T1580', 'T1526', 'T1136.001', 'T1098',
          'T1190',
        ],
      },
      {
        id: 'cwpp',
        name: 'Cloud Workload Protection (CWPP)',
        type: 'preventive',
        coveredTechniques: [
          'T1611', 'T1059.004', 'T1543',
          'T1190',
        ],
      },
      {
        id: 'cloud-waf',
        name: 'Web Application Firewall (WAF)',
        type: 'preventive',
        coveredTechniques: [
          'T1190', 'T1189', 'T1659',
          'T1498', 'T1499',
        ],
      },
    ],
  },
  {
    id: 'data-security',
    name: 'Data Security',
    icon: '🗄️',
    description: 'DLP, encryption, backup, data governance',
    color: '#ef4444',
    controls: [
      {
        id: 'dlp',
        name: 'Data Loss Prevention (DLP)',
        type: 'preventive',
        coveredTechniques: [
          'T1041', 'T1048', 'T1048.003', 'T1567', 'T1567.002',
          'T1537', 'T1052', 'T1114',
        ],
      },
      {
        id: 'encryption-rest',
        name: 'Encryption at Rest',
        type: 'preventive',
        coveredTechniques: [
          'T1005', 'T1039', 'T1025', 'T1602',
        ],
      },
      {
        id: 'encryption-transit',
        name: 'Encryption in Transit (TLS/mTLS)',
        type: 'preventive',
        coveredTechniques: [
          'T1557', 'T1040', 'T1048.003',
        ],
      },
      {
        id: 'backup',
        name: 'Immutable Backup & Recovery',
        type: 'corrective',
        coveredTechniques: [
          'T1486', 'T1490', 'T1485', 'T1561',
        ],
      },
    ],
  },
  {
    id: 'vulnerability-management',
    name: 'Vulnerability Management',
    icon: '🔍',
    description: 'Vulnerability scanning, pen testing, deception tech',
    color: '#f97316',
    controls: [
      {
        id: 'vuln-scanner',
        name: 'Vulnerability Scanner',
        type: 'detective',
        coveredTechniques: [
          'T1190', 'T1068', 'T1203', 'T1195',
        ],
      },
      {
        id: 'pentest',
        name: 'Penetration Testing',
        type: 'detective',
        coveredTechniques: [
          'T1190', 'T1078', 'T1068', 'T1133',
          'T1046',
        ],
      },
      {
        id: 'deception',
        name: 'Deception Technology (Honeypots)',
        type: 'detective',
        coveredTechniques: [
          'T1046', 'T1021', 'T1087', 'T1069',
          'T1135', 'T1057',
        ],
      },
    ],
  },
];

// Build flat list of all controls
export const ALL_CONTROLS = CONTROL_CATEGORIES.flatMap(cat =>
  cat.controls.map(ctrl => ({ ...ctrl, category: cat.id, categoryName: cat.name }))
);

// Build map: techniqueId → [controls that cover it]
export function buildControlCoverageMap(enabledControls) {
  const map = {};
  ALL_CONTROLS.forEach(ctrl => {
    if (enabledControls.includes(ctrl.id)) {
      ctrl.coveredTechniques.forEach(tid => {
        if (!map[tid]) map[tid] = [];
        map[tid].push(ctrl);
      });
    }
  });
  return map;
}
