interface LogoAureProps {
  /** "full" = icon + wordmark (default), "icon" = icon only */
  variant?: "full" | "icon";
  /** Size scale */
  size?: "sm" | "md" | "lg";
  /** For use on dark backgrounds (white text) */
  dark?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { box: 28, radius: 6, fontSize: 16, textSize: "text-lg",   gap: "gap-2" },
  md: { box: 32, radius: 7, fontSize: 18, textSize: "text-xl",   gap: "gap-2" },
  lg: { box: 38, radius: 8, fontSize: 22, textSize: "text-2xl",  gap: "gap-2.5" },
};

export function LogoAure({
  variant = "full",
  size = "md",
  dark = false,
  className = "",
}: LogoAureProps) {
  const { box, radius, fontSize } = sizeMap[size];
  const textClass = `${sizeMap[size].textSize} ${sizeMap[size].gap}`;

  return (
    <span className={`inline-flex items-center ${sizeMap[size].gap} ${className}`} aria-label="Aure">
      {/* Icon — inline SVG garante render independente de arquivo externo */}
      <svg
        width={box}
        height={box}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <rect width="48" height="48" rx={radius * (48 / box)} fill="#34095e" />
        {/* Stylized "A" path — traço grosso bold condensado como no original */}
        <text
          x="24"
          y="36"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', 'Arial Black', sans-serif"
          fontWeight="900"
          fontSize={fontSize * (48 / box)}
          fill="white"
          letterSpacing="-1"
        >
          A
        </text>
      </svg>

      {/* Wordmark */}
      {variant === "full" && (
        <span
          className={`font-black tracking-tight leading-none select-none ${sizeMap[size].textSize}`}
          style={{
            color: dark ? "white" : "#34095e",
            fontWeight: 900,
            letterSpacing: "-0.02em",
          }}
        >
          Aure
        </span>
      )}
    </span>
  );
}
