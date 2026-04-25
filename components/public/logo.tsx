/**
 * UPCBMA logo. Accepts an optional `src` so callers can override per-chapter
 * or state-level. Falls back to the bundled SVG at /public/upcbma-logo.svg
 * — replace that file with the official asset if/when one's uploaded as a
 * static placeholder.
 */
export function Logo({
  src,
  size = 36,
  className,
}: {
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const url = src && src.trim() ? src : "/upcbma-logo.svg";
  // Use plain <img> (not next/image) so external URLs don't have to be
  // explicitly whitelisted in next.config.ts every time the admin changes
  // the logo URL.
  return (
    <img
      src={url}
      alt="UPCBMA logo"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
