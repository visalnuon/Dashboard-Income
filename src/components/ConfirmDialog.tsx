import { useLanguage } from "../hooks/useLanguage";
import { Modal } from "./Modal";

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({ title, message, confirmLabel, onCancel, onConfirm }: ConfirmDialogProps) {
  const { t } = useLanguage();
  return (
    <Modal title={title} subtitle={message} onClose={onCancel}>
      <div className="modal-actions">
        <button type="button" className="ghost-btn bordered" onClick={onCancel}>{t("common.cancel")}</button>
        <button type="button" className="primary-btn danger-btn" onClick={onConfirm}>{confirmLabel ?? t("common.delete")}</button>
      </div>
    </Modal>
  );
}
