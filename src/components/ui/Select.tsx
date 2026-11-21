import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  /** Second line or trailing text, e.g. the currency's full name */
  hint?: string;
}

interface SelectProps {
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Adds a filter box at the top of the list */
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  'aria-labelledby'?: string;
}

/**
 * Custom listbox. Renders into <body> so a modal's scrolling body never clips it,
 * sits above modals, and follows the WAI-ARIA select-only combobox pattern.
 */
export const Select: React.FC<SelectProps> = ({
  id,
  value,
  options,
  onChange,
  searchable = false,
  searchPlaceholder = 'Tìm…',
  className,
  ...aria
}) => {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; maxHeight: number; above: boolean }>();

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q));
  }, [options, query]);

  const place = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const placeAbove = below < 240 && above > below;
    setPos({
      left: rect.left,
      top: placeAbove ? rect.top - 6 : rect.bottom + 6,
      width: Math.max(rect.width, searchable ? 260 : 0),
      maxHeight: Math.min(320, placeAbove ? above : below),
      above: placeAbove,
    });
  };

  const openList = () => {
    place();
    setQuery('');
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const choose = (opt: SelectOption | undefined) => {
    if (!opt) return;
    onChange(opt.value);
    close();
  };

  // Keep the list attached to the trigger while the page or a modal scrolls
  useLayoutEffect(() => {
    if (!open) return;
    const onMove = () => place();
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    (searchable ? searchRef.current : listRef.current)?.focus();
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!listRef.current?.parentElement?.contains(t) && !triggerRef.current?.contains(t)) close(false);
    };
    document.addEventListener('pointerdown', onPointer, true);
    return () => document.removeEventListener('pointerdown', onPointer, true);
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => Math.min(filtered.length - 1, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(filtered.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        choose(filtered[active]);
        break;
      case 'Escape':
        // Close the list only, not the modal behind it
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        close();
        break;
      case 'Tab':
        close(false);
        break;
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={aria['aria-labelledby']}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={cn('field flex items-center justify-between gap-2 text-left', open && 'border-accent', className)}
      >
        <span className="min-w-0 truncate">
          {selected ? (
            <>
              <span className="font-semibold text-ink">{selected.label}</span>
              {selected.hint && <span className="ml-2 text-muted">{selected.hint}</span>}
            </>
          ) : (
            <span className="text-muted">Chọn…</span>
          )}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted transition-transform duration-150', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            className="fixed z-[450] flex flex-col overflow-hidden rounded-control border border-rule bg-surface shadow-[var(--shadow-overlay)]"
            style={{
              left: Math.min(pos.left, window.innerWidth - pos.width - 8),
              width: pos.width,
              maxHeight: pos.maxHeight,
              ...(pos.above ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
            }}
            onKeyDown={onKeyDown}
          >
            {searchable && (
              <div className="relative border-b border-rule p-2">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  aria-controls={listId}
                  aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
                  autoComplete="off"
                  spellCheck={false}
                  className="field h-9 min-h-0 pl-8"
                />
              </div>
            )}
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              tabIndex={-1}
              aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
              className="no-scrollbar overflow-y-auto p-1 outline-none"
            >
              {filtered.length === 0 && <li className="px-3 py-2 text-sm text-muted">Không tìm thấy</li>}
              {filtered.map((opt, i) => {
                const isSelected = opt.value === value;
                return (
                  <li
                    key={opt.value}
                    id={`${listId}-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={isSelected}
                    onPointerMove={() => setActive(i)}
                    onClick={() => choose(opt)}
                    className={cn(
                      'flex min-h-10 cursor-pointer items-center gap-2 rounded-chip px-3 text-sm',
                      i === active ? 'bg-paper-3 text-ink' : 'text-ink-2'
                    )}
                  >
                    <span className="font-semibold">{opt.label}</span>
                    {opt.hint && <span className="min-w-0 flex-1 truncate text-muted">{opt.hint}</span>}
                    {isSelected && <Check className="ml-auto h-4 w-4 shrink-0 text-accent" aria-hidden="true" />}
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body
        )}
    </>
  );
};
