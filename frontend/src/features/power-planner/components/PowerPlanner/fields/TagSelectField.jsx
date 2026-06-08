import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiChevronDown, FiX } from "react-icons/fi";

// Dropdown for Category / Purpose / Delegate. Behaves like the old native select
// (picks a value, or "Other" → free-text box with a × to go back), but it's a
// custom portal menu so user-added "Other" names can show a small × on the right
// to remove them straight from the list — no separate manager box.
const TagSelectField = ({
  value = "",
  customValue = "",
  // The ROW's OWN value (before any parent-cascade). Used to decide whether to
  // show the free-text "Other" box: only when this row itself picked "Other".
  // When a sub-action merely INHERITS a parent's "Other", it stays a dropdown so
  // the user can still open it and choose something else. Falls back to `value`.
  ownValue,
  options = [],
  onChange,
  onChangeCustom,
  onClear,
  placeholder = "Select",
  customPlaceholder = "Type…",
  missing = false,
  title,
  // Values the user added themselves (removable from the list) + remover.
  removable = [],
  onRemove,
}) => {
  const border = missing ? "border-red-600" : "border-black";
  const showInput = (ownValue !== undefined ? ownValue : value) === "Other";
  // What the closed button shows: the typed text for "Other", else the value.
  const display = value === "Other" ? customValue : value;
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const removableSet = new Set(removable);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (
        !menuRef.current?.contains(e.target) &&
        !btnRef.current?.contains(e.target)
      )
        setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    // Close on PAGE scroll (the menu is fixed-positioned, so it would drift) —
    // but NOT when the user scrolls inside the menu's own list.
    const onScroll = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  if (showInput) {
    return (
      <div className="flex w-full items-center gap-1">
        <input
          type="text"
          value={customValue}
          onChange={(e) => onChangeCustom?.(e.target.value)}
          placeholder={customPlaceholder}
          className={`min-w-0 flex-1 rounded-lg border bg-white px-1.5 py-1.5 text-xs ${border}`}
        />
        <button
          type="button"
          title="Pick from list"
          onClick={onClear}
          className="shrink-0 rounded-md border border-black bg-white px-1.5 py-1 text-[11px] font-bold text-black hover:bg-red-600 hover:border-red-600 hover:text-white"
        >
          ×
        </button>
      </div>
    );
  }

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const vh = window.innerHeight || 800;
      const spaceBelow = vh - r.bottom;
      const spaceAbove = r.top;
      // Flip the menu UP when there's not enough room below it (e.g. rows near
      // the bottom of the page), like a native dropdown.
      const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        140,
        Math.min(260, (openUp ? spaceAbove : spaceBelow) - 8)
      );
      setPos({
        left: r.left,
        width: r.width,
        maxHeight,
        top: openUp ? undefined : r.bottom + 2,
        bottom: openUp ? vh - r.top + 2 : undefined,
      });
    }
    setOpen(true);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={title}
        onClick={toggle}
        className={`flex w-full items-center justify-between gap-1 rounded-lg border bg-white px-1.5 py-1.5 text-xs ${border}`}
      >
        <span className={`truncate ${display ? "text-black" : "text-black/40"}`}>
          {display || placeholder}
        </span>
        <FiChevronDown className="shrink-0 text-black/50" />
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                left: pos.left,
                top: pos.top,
                bottom: pos.bottom,
                width: Math.max(pos.width, 170),
                maxHeight: pos.maxHeight,
              }}
              className="z-[60] overflow-auto rounded-lg border border-black bg-white py-1 text-xs shadow-lg"
            >
              {options.map((opt) => (
                <div
                  key={opt || "select"}
                  className="flex items-center justify-between gap-1 px-1 hover:bg-zinc-100"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange?.(opt);
                      setOpen(false);
                    }}
                    className={`min-w-0 flex-1 truncate px-1.5 py-1.5 text-left ${
                      opt === value ? "font-bold text-red-600" : "text-black"
                    } ${!opt ? "text-black/40" : ""}`}
                  >
                    {opt || placeholder}
                  </button>
                  {removableSet.has(opt) && onRemove ? (
                    <button
                      type="button"
                      title={`Remove "${opt}"`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(opt);
                      }}
                      className="mr-1 shrink-0 rounded p-0.5 text-black/40 transition hover:bg-red-600 hover:text-white"
                    >
                      <FiX className="text-xs" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
};

export default TagSelectField;
