import { FaAnglesUp, FaStar } from "react-icons/fa6";
import { TbRectangleVerticalFilled } from "react-icons/tb";

// Rank insignia: stars for officers, a bar for lieutenants, chevrons for sergeants.
export function Insignia({ grade, stars, size = 18, className = "" }: { grade: string; stars?: number; size?: number; className?: string }) {
  const color = "var(--signal)";
  if (stars && stars > 0)
    return (
      <span className={`inline-flex gap-0.5 ${className}`} aria-hidden>
        {Array.from({ length: stars }, (_, i) => (
          <FaStar key={i} size={size} color={color} />
        ))}
      </span>
    );
  if (grade === "Lieutenant") return <TbRectangleVerticalFilled size={size} color={color} className={`scale-x-60 ${className}`} aria-hidden />;
  return <FaAnglesUp size={size} color={color} className={className} aria-hidden />;
}
