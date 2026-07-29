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
  return (
    <span className={`vizora-brand ${light ? "vizora-brand-light" : ""} ${className}`}>
      <img
        src={`${import.meta.env.BASE_URL}brand/${compact ? "vizora-mark.webp" : "vizora-logo.webp"}`}
        alt="VIZORA.TJ"
        className={compact ? "vizora-brand-mark" : "vizora-brand-full"}
      />
    </span>
  );
}
