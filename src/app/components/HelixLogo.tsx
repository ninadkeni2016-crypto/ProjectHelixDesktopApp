type HelixLogoProps = {
  size?: number;
  className?: string;
};

export function HelixLogo({ size = 32, className = "" }: HelixLogoProps) {
  return (
    <img
      src="/images/helix-logo.png"
      alt="Project Helix"
      width={size}
      height={size}
      className={`object-contain select-none ${className}`}
      draggable={false}
    />
  );
}
