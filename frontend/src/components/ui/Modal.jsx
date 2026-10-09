import { useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export function Modal({ open, onClose, title, children, width = 520 }) {
  const titleId = useId();
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    // move focus into the dialog
    panel.current?.querySelector('input, select, textarea, button:not(.modal__close)')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="modal__panel"
            style={{ maxWidth: width }}
            initial={{ opacity: 0, y: 40, scale: 0.96, rotateX: 8 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <header className="modal__head">
              <h2 id={titleId}>{title}</h2>
              <button className="icon-btn modal__close" onClick={onClose} aria-label="Close dialog">
                <X size={18} />
              </button>
            </header>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
