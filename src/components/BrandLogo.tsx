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
  const lightAsset = `${import.meta.env.BASE_URL}brand/${compact ? "vizora-mark.webp" : "vizora-logo-silver.png"}`;

  return (
    <span className={`vizora-brand ${compact ? "vizora-brand-compact" : ""} ${light ? "vizora-brand-light" : ""} ${className}`}>
      <img
        src={asset}
        alt="VIZORA.TJ"
        className={`${compact ? "vizora-brand-mark" : "vizora-brand-full"} vizora-brand-default-image`}
      />
      <img
        src={lightAsset}
        alt=""
        aria-hidden="true"
        className={`${compact ? "vizora-brand-mark" : "vizora-brand-full"} vizora-brand-light-image`}
      />
    </span>
  );
}
