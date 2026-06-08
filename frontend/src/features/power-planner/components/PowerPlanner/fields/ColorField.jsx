import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiChevronDown, FiX } from "react-icons/fi";
import { COLOR_CODES, colorByKey } from "../../../data/colorCoding";

// Colour-coding picker. Compact button shows the current colour swatch + label;
// the menu lists every colour (swatch + name) plus "No colour". Portal-rendered
// so it never gets clipped by the table's horizontal scroll, and flips up near
// the bottom of the page.
const Swatch = ({ hex }) => (
  <span
    className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-black/30"
    style={{ background: hex || "transparent" }}
  />
);

const ColorField = ({ value = "", onChange }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const current = colorByKey(value);

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
      const openUp = spaceBelow < 260 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(160, Math.min(300, (openUp ? spaceAbove : spaceBelow) - 8));
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

  const pick = (key) => {
    onChange?.(key);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        title={current ? current.label : "Set colour code"}
        className="flex w-full items-center gap-1.5 rounded-lg border border-black bg-white px-1.5 py-1.5 text-xs"
      >
        <Swatch hex={current?.hex} />
        <span className={`flex-1 truncate text-left ${current ? "text-black" : "text-black/40"}`}>
          {current ? current.label : "Colour"}
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
                width: Math.max(pos.width, 190),
                maxHeight: pos.maxHeight,
              }}
              className="z-[60] overflow-auto rounded-lg border border-black bg-white py-1 text-xs shadow-lg"
            >
              <button
                type="button"
                onClick={() => pick("")}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-zinc-100"
              >
                <FiX className="h-3.5 w-3.5 shrink-0 text-black/40" />
                <span className="text-black/60">No colour</span>
              </button>
              {COLOR_CODES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => pick(c.key)}
                  className={`flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-zinc-100 ${
                    c.key === value ? "font-bold" : ""
                  }`}
                >
                  <Swatch hex={c.hex} />
                  <span className="truncate text-black">{c.label}</span>
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
};

export default ColorField;
