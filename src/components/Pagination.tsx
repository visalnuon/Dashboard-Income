import { useLanguage } from "../hooks/useLanguage";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
};

export function Pagination({ page, pageSize, total, onPage }: PaginationProps) {
  const { t } = useLanguage();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  return (
    <div className="pagination">
      <button className="ghost-btn bordered" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {t("page.prev")}
      </button>
      <span>{t("page.of", { page, pages })}</span>
      <button className="ghost-btn bordered" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {t("page.next")}
      </button>
    </div>
  );
}
