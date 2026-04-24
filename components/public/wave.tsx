/**
 * Decorative SVG — a cross-section of corrugated board. Used as a subtle
 * section divider or background motif to reference the industry the
 * association represents.
 */
export function CorrugatedWave({
  className,
  strokeWidth = 1.25,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 40"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M 0 20 Q 30 0, 60 20 T 120 20 T 180 20 T 240 20 T 300 20 T 360 20 T 420 20 T 480 20 T 540 20 T 600 20 T 660 20 T 720 20 T 780 20 T 840 20 T 900 20 T 960 20 T 1020 20 T 1080 20 T 1140 20 T 1200 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}
