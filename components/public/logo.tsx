import Image from "next/image";

/**
 * UPCBMA logo. Stored at /public/upcbma-logo.svg.
 * Replace that file with a real raster/SVG logo whenever a final asset is
 * available — no code changes needed elsewhere.
 */
export function Logo({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/upcbma-logo.svg"
      alt="UPCBMA logo"
      width={size}
      height={size * 1.1}
      className={className}
      priority={false}
    />
  );
}
