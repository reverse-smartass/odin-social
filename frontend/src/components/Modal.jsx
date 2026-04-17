// ============================================================
// src/components/Modal.jsx
// ============================================================
import { useEffect } from "react";
import "../styles/ui.css";

export default function Modal({ title, onClose, children, maxWidth = 440 }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ maxWidth }} role="dialog" aria-modal>
        {onClose && (
          <button className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        )}
        {title && <h2 className="modal__title">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
