import { useLayoutEffect, useRef } from "react";

// A textarea that grows to fit its content and can't be manually resized, so a
// long entry is always fully visible and the user can't drag the box smaller
// than its text. Height is recomputed whenever the value changes.
const AutoGrowTextarea = ({ value, onChange, className = "", minRows = 2, ...props }) => {
  const ref = useRef(null);

  const resize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useLayoutEffect(() => {
    resize(ref.current);
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      onChange={(e) => {
        onChange?.(e);
        resize(e.target);
      }}
      className={`resize-none overflow-hidden ${className}`}
      {...props}
    />
  );
};

export default AutoGrowTextarea;
