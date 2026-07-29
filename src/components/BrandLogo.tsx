interface BrandLogoProps {
  compact?: boolean;
  className?: string;
  light?: boolean;
}

export default function BrandLogo({
  compact = false,
  className = "",
  light = false
}: BrandLogoProps) {
  const asset = `${import.meta.env.BASE_URL}brand/${compact ? "vizora-mark.webp" : "vizora-logo.webp"}`;

  return (
    <span className={`vizora-brand ${compact ? "vizora-brand-compact" : ""} ${light ? "vizora-brand-light" : ""} ${className}`}>
      <img
        src={asset}
        alt="VIZORA.TJ"
        className={compact ? "vizora-brand-mark" : "vizora-brand-full"}
      />
      <span
        aria-hidden="true"
        className="vizora-brand-gradient"
        style={{ WebkitMaskImage: `url("${asset}")`, maskImage: `url("${asset}")` }}
      />
    </span>
  );
}
