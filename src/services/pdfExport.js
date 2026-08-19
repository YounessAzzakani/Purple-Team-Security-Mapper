import jsPDF from 'jspdf';

/**
 * Generate a professional executive PDF report for a Purple Team assessment.
 * Uses pure native jsPDF drawing for 100% reliable cross-platform export.
 * @param {Object} assessment - Full assessment object containing analysis and inputs.
 */
export function exportAssessmentToPdf(assessment) {
  if (!assessment) return;

  const analysis = assessment.analysis || {};
  const result = assessment.result || {};
  const inputs = assessment.inputs || {};
  const techniqueScores = result.techniqueScores || {};
  const criticalGaps = result.criticalGaps || [];
  const weakGaps = result.weakGaps || [];

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Color Palette
  const darkBg = [15, 23, 42]; // Slate 900
  const primaryColor = [124, 58, 237]; // Violet 600
  const secondaryColor = [6, 182, 212]; // Cyan 500
  const textColor = [51, 65, 85]; // Slate 700
  const lightText = [100, 116, 139]; // Slate 500
  const cardBg = [248, 250, 252]; // Slate 50
  const borderCol = [226, 232, 240]; // Slate 200
  const redCol = [244, 63, 94]; // Rose 500
  const greenCol = [16, 185, 129]; // Emerald 500
  const amberCol = [245, 158, 11]; // Amber 500

  // ── Header Banner ──
  doc.setFillColor(...darkBg);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Accent Line
  doc.setFillColor(...primaryColor);
  doc.rect(0, 39, pageWidth, 1.5, 'F');

  // Logo / Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ATTACKPRISM', 14, 17);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(192, 132, 252);
  doc.text('ADVERSARY DEFENSE ENGINE // EXECUTIVE ASSESSMENT REPORT', 14, 25);

  // Metadata right-aligned
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  const scanDate = analysis.created_at ? new Date(analysis.created_at).toLocaleString() : new Date().toLocaleString();
  doc.text(`Report ID: #${analysis.id || 'SNAPSHOT'}`, pageWidth - 14, 15, { align: 'right' });
  doc.text(`Generated: ${scanDate}`, pageWidth - 14, 22, { align: 'right' });
  doc.text(`Assessment: ${analysis.name || 'Purple Team Assessment'}`, pageWidth - 14, 29, { align: 'right' });

  let currentY = 48;

  // ── Executive Posture Hero Box ──
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...borderCol);
  doc.roundedRect(14, currentY, pageWidth - 28, 38, 2.5, 2.5, 'FD');

  // Posture Dial Box
  const score = analysis.posture_score ?? result.postureScore ?? 0;
  const scoreColor = score >= 75 ? greenCol : score >= 50 ? secondaryColor : score >= 30 ? amberCol : redCol;

  doc.setFillColor(...scoreColor);
  doc.roundedRect(19, currentY + 5, 42, 28, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('POSTURE SCORE', 40, currentY + 13, { align: 'center' });
  doc.setFontSize(17);
  doc.text(`${score}/100`, 40, currentY + 25, { align: 'center' });

  // Key Metrics
  doc.setTextColor(...darkBg);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Defense Posture Evaluation', 68, currentY + 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  const totalTech = result.totalTechniques || Object.keys(techniqueScores).length || 0;
  const coveredTech = result.coveredCount || 0;
  const covPct = totalTech ? Math.round((coveredTech / totalTech) * 100) : 0;

  doc.text(`• Total Evaluated MITRE Techniques: ${totalTech}`, 68, currentY + 18);
  doc.text(`• Active Technique Coverage: ${coveredTech} covered (${covPct}% Enterprise Defense)`, 68, currentY + 24);
  doc.text(`• Critical Uncovered Gaps: ${criticalGaps.length} | Weak Monitored Gaps: ${weakGaps.length}`, 68, currentY + 30);

  currentY += 46;

  // ── Section 1: Scope & Configured Controls ──
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('1. Telemetry Scope & Assessment Parameters', 14, currentY);
  currentY += 6;

  // Table Container
  const startX = 14;
  const col1W = 55;
  const col2W = pageWidth - 28 - col1W;
  const rowHeight = 7.5;

  const scopeRows = [
    ['Target Adversaries (APTs)', (inputs.actorIds && inputs.actorIds.length ? inputs.actorIds.join(', ') : 'All MITRE ATT&CK Threat Groups').toUpperCase()],
    ['Active Security Solutions', (inputs.securitySolutions || []).map(s => s.name).join(', ') || 'EDR, SIEM, NGFW, Cloud Defenses'],
    ['Detection Engineering Rules', `${inputs.rules?.length || 0} Sigma Detection Rules Active`],
    ['Scoring Formula', 'Sigma Rules (40%) + Preventive Controls (30%) + Detective Methods (30%)'],
  ];

  // Header
  doc.setFillColor(...darkBg);
  doc.rect(startX, currentY, pageWidth - 28, rowHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('SCOPE DOMAIN', startX + 4, currentY + 5);
  doc.text('CONFIGURED ENTERPRISE PARAMETERS', startX + col1W + 4, currentY + 5);
  currentY += rowHeight;

  // Body
  doc.setFont('helvetica', 'normal');
  scopeRows.forEach((row, i) => {
    doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
    doc.rect(startX, currentY, pageWidth - 28, rowHeight, 'F');
    doc.setDrawColor(...borderCol);
    doc.rect(startX, currentY, pageWidth - 28, rowHeight, 'S');

    doc.setTextColor(...darkBg);
    doc.setFont('helvetica', 'bold');
    doc.text(row[0], startX + 4, currentY + 5);

    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'normal');
    doc.text(row[1], startX + col1W + 4, currentY + 5);

    currentY += rowHeight;
  });

  currentY += 8;

  // ── Section 2: Critical Gaps & Blue Team Directives ──
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('2. Top Critical Missing Controls & Blue Team Action Directives', 14, currentY);
  currentY += 6;

  // Table header for Gaps
  doc.setFillColor(...primaryColor);
  doc.rect(startX, currentY, pageWidth - 28, rowHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TTP ID', startX + 3, currentY + 5);
  doc.text('TECHNIQUE NAME', startX + 22, currentY + 5);
  doc.text('TACTIC', startX + 68, currentY + 5);
  doc.text('ACTIONABLE BLUE TEAM DIRECTIVE', startX + 105, currentY + 5);
  currentY += rowHeight;

  const topGaps = criticalGaps.slice(0, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  if (topGaps.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(startX, currentY, pageWidth - 28, rowHeight, 'F');
    doc.setDrawColor(...borderCol);
    doc.rect(startX, currentY, pageWidth - 28, rowHeight, 'S');
    doc.setTextColor(...greenCol);
    doc.text('No critical coverage gaps identified. All evaluated techniques have active coverage.', startX + 4, currentY + 5);
    currentY += rowHeight;
  } else {
    topGaps.forEach((g, i) => {
      if (currentY > pageHeight - 20) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFillColor(i % 2 === 0 ? 255 : 255, i % 2 === 0 ? 255 : 241, i % 2 === 0 ? 255 : 242);
      doc.rect(startX, currentY, pageWidth - 28, rowHeight, 'F');
      doc.setDrawColor(...borderCol);
      doc.rect(startX, currentY, pageWidth - 28, rowHeight, 'S');

      doc.setTextColor(...redCol);
      doc.setFont('helvetica', 'bold');
      doc.text(g.id, startX + 3, currentY + 5);

      doc.setTextColor(...darkBg);
      doc.text(g.name.length > 25 ? g.name.slice(0, 23) + '…' : g.name, startX + 22, currentY + 5);

      doc.setTextColor(...lightText);
      doc.setFont('helvetica', 'normal');
      doc.text(g.tactic || 'General', startX + 68, currentY + 5);

      doc.setTextColor(...textColor);
      const directive = `Deploy Sigma rule for ${g.name}. Enable telemetry.`;
      doc.text(directive.length > 48 ? directive.slice(0, 46) + '…' : directive, startX + 105, currentY + 5);

      currentY += rowHeight;
    });
  }

  currentY += 8;

  // ── Section 3: Technique Defense Spectrum ──
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('3. Evaluated MITRE ATT&CK Techniques Inventory', 14, currentY);
  currentY += 6;

  // Table header
  doc.setFillColor(...darkBg);
  doc.rect(startX, currentY, pageWidth - 28, rowHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ID', startX + 3, currentY + 5);
  doc.text('TECHNIQUE NAME', startX + 22, currentY + 5);
  doc.text('TACTIC', startX + 75, currentY + 5);
  doc.text('SCORE', startX + 115, currentY + 5);
  doc.text('DEFENSE LEVEL', startX + 135, currentY + 5);
  doc.text('COVERING CONTROLS', startX + 158, currentY + 5);
  currentY += rowHeight;

  const techList = Object.entries(techniqueScores).slice(0, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  techList.forEach(([tid, t], i) => {
    if (currentY > pageHeight - 20) {
      doc.addPage();
      currentY = 20;
    }
    const sc = t.score || 0;
    const lvlColor = sc >= 75 ? greenCol : sc >= 50 ? secondaryColor : sc >= 25 ? amberCol : redCol;

    doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
    doc.rect(startX, currentY, pageWidth - 28, rowHeight, 'F');
    doc.setDrawColor(...borderCol);
    doc.rect(startX, currentY, pageWidth - 28, rowHeight, 'S');

    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(tid, startX + 3, currentY + 5);

    doc.setTextColor(...darkBg);
    doc.text(t.name.length > 28 ? t.name.slice(0, 26) + '…' : t.name, startX + 22, currentY + 5);

    doc.setTextColor(...lightText);
    doc.setFont('helvetica', 'normal');
    doc.text(t.tactic || 'General', startX + 75, currentY + 5);

    doc.setTextColor(...lvlColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`${sc}%`, startX + 115, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.text(t.level || 'None', startX + 135, currentY + 5);

    doc.setTextColor(...lightText);
    const ctrls = (t.coveringControls || []).map(c => c.name).slice(0, 1).join(', ') || 'None';
    doc.text(ctrls.length > 18 ? ctrls.slice(0, 16) + '…' : ctrls, startX + 158, currentY + 5);

    currentY += rowHeight;
  });

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(...lightText);
    doc.text('ATTACKPRISM Defense Engine — Confidential Purple Team Assessment Report', 14, pageHeight - 8);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
  }

  // Save File
  const filename = `ATTACKPRISM-Report-${analysis.id || 'Assessment'}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
