import logo from "../assets/visal-logo.png";
import { useLanguage } from "../hooks/useLanguage";

type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className = "" }: BrandLogoProps) {
  const { t } = useLanguage();
  return (
    <img
      src={logo}
      alt={t("brand.name")}
      className={`brand-logo ${className}`.trim()}
    />
  );
}
