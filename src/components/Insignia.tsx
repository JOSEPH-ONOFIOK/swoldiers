// Rank insignia drawn in SVG: stars for officers, a bar for lieutenants, chevrons for sergeants.
export function Insignia({ grade, stars, size = 18, className = "" }: { grade: string; stars?: number; size?: number; className?: string }) {
  const color = "var(--signal)";
  if (stars && stars > 0)
    return (
      <span className={`inline-flex gap-0.5 ${className}`} aria-hidden>
        {Array.from({ length: stars }, (_, i) => (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24">
            <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z" fill={color} />
          </svg>
        ))}
      </span>
    );
  if (grade === "Lieutenant")
    return (
      <svg width={size * 0.7} height={size} viewBox="0 0 14 24" className={className} aria-hidden>
        <rect x="3" y="2" width="8" height="20" fill={color} />
      </svg>
    );
  // chevrons
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      {[3, 9, 15].map((y) => (
        <path key={y} d={`M3 ${y + 6} L12 ${y} L21 ${y + 6}`} stroke={color} strokeWidth="3.2" fill="none" />
      ))}
    </svg>
  );
}
