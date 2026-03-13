interface LogoAureProps {
  /** "full" = logo completa com AURE (default), "icon" = ícone quadrado só */
  variant?: "full" | "icon";
  /** Altura do logo */
  size?: "sm" | "md" | "lg";
  /** Para uso em fundos escuros — inverte as cores para branco */
  dark?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { imgH: 24, box: 28, radius: 6, fontSize: 16 },
  md: { imgH: 28, box: 32, radius: 7, fontSize: 18 },
  lg: { imgH: 36, box: 38, radius: 8, fontSize: 22 },
};

export function LogoAure({
  variant = "full",
  size = "md",
  dark = false,
  className = "",
}: LogoAureProps) {
  const { imgH, box, radius, fontSize } = sizeMap[size];

  if (variant === "full") {
    return (
      <img
        src="/logo_aure.svg"
        alt="Aure"
        style={{
          height: imgH,
          width: "auto",
          // dark=true: inverte para branco (purple→black→white), transparência preservada
          filter: dark ? "brightness(0) invert(1)" : undefined,
          flexShrink: 0,
        }}
        className={className}
      />
    );
  }

  // variant="icon" — ícone quadrado com "A"
  return (
    <span
      className={`inline-flex items-center ${className}`}
      aria-label="Aure"
    >
      <svg
        width={box}
        height={box}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <rect
          width="48"
          height="48"
          rx={radius * (48 / box)}
          fill={dark ? "white" : "#34095e"}
        />
        <text
          x="24"
          y="36"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', 'Arial Black', sans-serif"
          fontWeight="900"
          fontSize={fontSize * (48 / box)}
          fill={dark ? "#34095e" : "white"}
          letterSpacing="-1"
        >
          A
        </text>
      </svg>
    </span>
  );
}
