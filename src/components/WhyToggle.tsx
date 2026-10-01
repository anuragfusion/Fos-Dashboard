import { useId, useState, type ReactNode } from 'react';

export function WhyToggle({ label = 'Where this comes from', text, children }: { label?: string; text?: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="why">
      <button
        type="button"
        className="whyb"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        ↗ {label}
      </button>
      {open && (
        <div id={id} className="whyp">
          {text ?? children}
        </div>
      )}
    </div>
  );
}
