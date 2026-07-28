import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRCodeImageProps {
  value: string;
  size?: number;
  className?: string;
}

export default function QRCodeImage({
  value,
  size = 220,
  className = ""
}: QRCodeImageProps) {
  const [source, setSource] = useState("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#0b1220", light: "#ffffff" }
    }).then((url) => {
      if (active) setSource(url);
    });
    return () => {
      active = false;
    };
  }, [size, value]);

  if (!source) {
    return (
      <div
        className={`animate-pulse rounded-2xl bg-slate-100 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <img
      src={source}
      alt="QR-код электронной визитки"
      width={size}
      height={size}
      className={className}
    />
  );
}
