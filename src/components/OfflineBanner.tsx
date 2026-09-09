import { useEffect, useState } from "react";
import { useLanguage } from "../hooks/useLanguage";
import { Icon } from "./Icon";

export function OfflineBanner() {
  const { t } = useLanguage();
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;
  return (
    <div className="offline-banner" role="status">
      <Icon name="spark" />
      <span>{t("offline.message")}</span>
    </div>
  );
}
