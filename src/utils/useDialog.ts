import { useEffect, useId, useRef } from 'react';
import { asHistoryRecord, DIALOG_HISTORY_KEY } from './appHistory';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog behaviour shared by Modal and the assistant sheet:
 * Escape closes, focus moves in on open, Tab stays inside, focus returns on close,
 * and the page behind stops scrolling.
 */
export function useDialog(isOpen: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const dialogId = useId();
  const ownsHistoryEntryRef = useRef(false);
  onCloseRef.current = onClose;

  // Every open dialog/sheet gets its own browser-history level. Android's back
  // gesture therefore dismisses the top overlay before navigating the page.
  useEffect(() => {
    if (!isOpen) {
      if (ownsHistoryEntryRef.current) {
        ownsHistoryEntryRef.current = false;
        if (asHistoryRecord(window.history.state)[DIALOG_HISTORY_KEY] === dialogId) {
          window.history.back();
        }
      }
      return;
    }

    if (!ownsHistoryEntryRef.current) {
      window.history.pushState(
        { ...asHistoryRecord(window.history.state), [DIALOG_HISTORY_KEY]: dialogId },
        '',
        window.location.href
      );
      ownsHistoryEntryRef.current = true;
    }

    const onPopState = (event: PopStateEvent) => {
      if (asHistoryRecord(event.state)[DIALOG_HISTORY_KEY] === dialogId) return;
      ownsHistoryEntryRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [dialogId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFirst = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const target = panel.querySelector<HTMLElement>('[data-autofocus]') ?? panel.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? panel).focus();
    };
    const frame = requestAnimationFrame(focusFirst);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  return panelRef;
}
