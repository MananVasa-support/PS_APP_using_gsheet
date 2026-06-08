import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { FiCornerDownLeft, FiEdit2, FiChevronDown } from 'react-icons/fi';
import clsx from 'clsx';

/**
 * Reusable autocomplete input with keyboard navigation. Filtering is a
 * case-insensitive prefix match on the full option string, so typing "De"
 * surfaces "Delegate", "Deep Work", "Detach".
 *
 * When `onOthers` is provided, an "Others" row is shown at the bottom of the
 * dropdown once the user starts typing. Choosing it calls `onOthers()` so the
 * parent can switch to a custom-entry input.
 *
 * Props:
 *  - value / onChange: controlled text value
 *  - onSelect: called when a suggestion is chosen (defaults to onChange)
 *  - options: string[] of suggestions
 *  - onSubmit: called when Enter is pressed while the dropdown is closed
 *  - onOthers: called when the "Others" row is chosen
 *  - othersLabel: label for the "Others" row (default "Others")
 */
export default function Autocomplete({
  value,
  onChange,
  onSelect,
  options = [],
  placeholder,
  autoFocus = false,
  onSubmit,
  onOthers,
  othersLabel = 'Others',
  showAllOnFocus = false,
  className,
  inputClassName,
  error,
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  // Screen position of the dropdown (it's rendered in a portal so it can never
  // be clipped by an overflow ancestor, e.g. a scrollable table).
  const [pos, setPos] = useState(null);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const query = (value || '').trim();

  const matches = useMemo(() => {
    // With showAllOnFocus, an empty field lists every option (dropdown mode).
    if (!query) return showAllOnFocus ? options : [];
    const q = query.toLowerCase();
    return options.filter((o) => o.toLowerCase().startsWith(q));
  }, [query, options, showAllOnFocus]);

  // Rows shown in the dropdown: matching options, plus an "Others" row (when
  // enabled). In dropdown mode "Others" is always available.
  const rows = useMemo(() => {
    const r = matches.map((m) => ({ type: 'option', value: m }));
    if (onOthers && (query || showAllOnFocus)) {
      r.push({ type: 'others' });
    }
    return r;
  }, [matches, query, onOthers, showAllOnFocus]);

  const showDropdown = open && rows.length > 0;

  // Reset the highlight to the top as the query changes.
  useEffect(() => {
    setHighlight(0);
  }, [query]);

  // Close when clicking outside the component. The dropdown lives in a portal,
  // so a click on it is "outside" the container — also treat clicks inside the
  // list as inside, otherwise selecting an option would close before it lands.
  useEffect(() => {
    function onDocPointer(e) {
      const inContainer = containerRef.current?.contains(e.target);
      const inList = listRef.current?.contains(e.target);
      if (!inContainer && !inList) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocPointer);
    return () => document.removeEventListener('mousedown', onDocPointer);
  }, []);

  // Anchor the portal dropdown under the input, and keep it anchored while any
  // ancestor scrolls or the window resizes.
  useEffect(() => {
    if (!showDropdown) return undefined;
    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.left, width: r.width });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDropdown]);

  // Keep the active row scrolled into view.
  useEffect(() => {
    if (!showDropdown || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${highlight}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [highlight, showDropdown]);

  const choose = (row) => {
    if (!row) return;
    if (row.type === 'others') {
      onOthers?.();
      setOpen(false);
      return;
    }
    const fn = onSelect || onChange;
    fn(row.value);
    setOpen(false);
  };

  const handleChange = (e) => {
    onChange(e.target.value);
    setOpen(true);
  };

  const handleKeyDown = (e) => {
    if (showDropdown) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlight((h) => (h + 1) % rows.length);
          return;
        case 'ArrowUp':
          e.preventDefault();
          setHighlight((h) => (h - 1 + rows.length) % rows.length);
          return;
        case 'Enter':
        case 'Tab':
          // Select the highlighted suggestion (or "Others") quickly.
          e.preventDefault();
          choose(rows[highlight] || rows[0]);
          return;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          return;
        default:
          return;
      }
    }
    if (e.key === 'Enter') {
      onSubmit?.();
    }
  };

  return (
    <div ref={containerRef} className={clsx('relative w-full', className)}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        autoFocus={autoFocus}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={() => {
          // In dropdown mode (showAllOnFocus) suggestions must NOT appear just
          // from focus — they open only on a dropdown-button click or typing.
          if (!showAllOnFocus) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className={clsx(
          'w-full h-12 pl-4 rounded-xl bg-white text-brand-ink placeholder-brand-gray-400 shadow-sm',
          'border border-brand-gray-200 transition-all duration-150',
          'hover:border-brand-gray-300 hover:shadow focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 focus:outline-none',
          showAllOnFocus ? 'pr-11' : 'pr-4',
          error && 'border-brand-red focus:border-brand-red focus:ring-brand-red/20',
          inputClassName
        )}
      />

      {showAllOnFocus ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Toggle suggestions"
          onMouseDown={(e) => {
            // Toggle the dropdown without stealing/blurring focus.
            e.preventDefault();
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray-400 hover:text-brand-gray-600"
        >
          <motion.span
            animate={{ rotate: showDropdown ? 180 : 0 }}
            transition={{ duration: 0.15 }}
            className="inline-flex"
          >
            <FiChevronDown size={18} />
          </motion.span>
        </button>
      ) : null}

      {showDropdown && pos
        ? createPortal(
          <motion.ul
            ref={listRef}
            role="listbox"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: pos.width,
            }}
            className="z-[60] max-h-80 overflow-auto rounded-xl border border-brand-gray-200 bg-white p-1.5 shadow-card"
          >
            {rows.map((row, i) => {
              const active = i === highlight;
              const isOthers = row.type === 'others';
              return (
                <li
                  key={isOthers ? 'others' : `option-${row.value}`}
                  data-index={i}
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    // Prevent the input from losing focus before selection.
                    e.preventDefault();
                    choose(row);
                  }}
                  className={clsx(
                    'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    // Pin "Others" to the bottom of the dropdown so it's always
                    // visible — the list of Power Words scrolls behind it and the
                    // user never has to scroll to the very end to reach it.
                    isOthers &&
                      'sticky bottom-0 -mb-1.5 mt-1 border-t border-brand-gray-100 pt-3 pb-3',
                    active
                      ? 'bg-brand-red-soft text-brand-red'
                      : isOthers
                      ? 'bg-white text-brand-gray-900 hover:bg-brand-gray-50'
                      : 'text-brand-gray-900 hover:bg-brand-gray-50'
                  )}
                >
                  {isOthers ? (
                    <>
                      <span
                        className={clsx(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                          active
                            ? 'bg-brand-red text-white'
                            : 'bg-brand-gray-100 text-brand-gray-900'
                        )}
                      >
                        <FiEdit2 size={12} />
                      </span>
                      <span className="font-medium">{othersLabel}</span>
                    </>
                  ) : (
                    <span className="truncate font-medium">{row.value}</span>
                  )}
                  {active ? (
                    <span className="ml-auto hidden items-center gap-1 text-[10px] uppercase tracking-wide opacity-70 sm:flex">
                      <FiCornerDownLeft size={12} />
                      {isOthers ? 'Add' : 'Select'}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </motion.ul>,
          document.body
        )
        : null}
    </div>
  );
}
