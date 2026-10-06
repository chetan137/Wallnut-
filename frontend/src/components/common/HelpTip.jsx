import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import './HelpTip.css';

const TIP_W = 280;
const GAP = 8;

/**
 * Small "i" next to a label. Hover (or focus / click on touch screens) opens a short box that
 * explains in plain words how that number is worked out. The box is drawn in a portal, fixed to the
 * screen, so a table's scroll area or a card edge can never clip it.
 *
 * Use `text` (string) for one paragraph, or `lines` (array of strings) for several.
 * `children` replaces the default icon when the label itself should be the hover target.
 */
export default function HelpTip({ text, lines, title, children, className = '' }) {
  const [pos, setPos] = useState(null); // { left, top } while open
  const ref = useRef(null);

  const open = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = r.left + r.width / 2 - TIP_W / 2;
    left = Math.max(8, Math.min(left, vw - TIP_W - 8));
    // Prefer below the label; flip above when it would run off the bottom of the screen.
    const below = r.bottom + GAP + 150 < vh;
    setPos({ left, top: below ? r.bottom + GAP : null, bottom: below ? null : vh - r.top + GAP });
  }, []);
  const close = useCallback(() => setPos(null), []);

  useEffect(() => {
    if (!pos) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('scroll', close, true); };
  }, [pos, close]);

  const body = lines && lines.length ? lines : [text];

  return (
    <>
      <span
        ref={ref}
        className={`help-tip ${className}`}
        tabIndex={0}
        role="button"
        aria-label={title || 'How this is calculated'}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        onClick={(e) => { e.stopPropagation(); if (pos) close(); else open(); }}
      >
        {children || <Info size={13} />}
      </span>
      {pos && createPortal(
        <div className="help-tip-box" style={{ left: pos.left, top: pos.top ?? undefined, bottom: pos.bottom ?? undefined, width: TIP_W }} role="tooltip">
          <div className="help-tip-title">{title || 'How this is calculated'}</div>
          {body.map((t, i) => <p key={i} className="help-tip-line">{t}</p>)}
        </div>,
        document.body
      )}
    </>
  );
}
