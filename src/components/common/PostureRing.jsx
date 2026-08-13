export default function PostureRing({ score, color }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={68} height={68}>
      <circle cx={34} cy={34} r={r} fill="none" stroke="var(--bg-tertiary)" strokeWidth={6} />
      <circle
        cx={34} cy={34} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ}
        strokeLinecap="round"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '34px 34px', transition: 'stroke-dashoffset 1.2s ease' }}
      />
      <text x={34} y={38} textAnchor="middle" fill={color} fontSize={13} fontWeight={800}>{score}%</text>
    </svg>
  );
}
