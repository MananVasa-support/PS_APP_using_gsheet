import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiLock } from "react-icons/fi";

// When a section is saved/locked its inputs live inside a disabled <fieldset>,
// so clicking a field does nothing — confusing for a new user who hasn't spotted
// the Edit button. This transparent layer sits over the locked table, and a
// click on it flashes a red "click Edit" toast. It renders only while locked, so
// it never blocks real editing.
const LockedOverlay = ({
  active,
  message = "This section is locked — click Edit to make changes.",
}) => {
  const [show, setShow] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => setShow(false), 2600);
    return () => window.clearTimeout(t);
  }, [show, tick]);

  if (!active) return null;

  const flash = () => {
    setShow(true);
    setTick((t) => t + 1);
  };

  return (
    <>
      <div
        onClick={flash}
        title="Click Edit to make changes"
        aria-hidden="true"
        className="absolute inset-0 z-20 cursor-not-allowed"
      />
      {show && typeof document !== "undefined"
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
              <div className="flex items-center gap-2 rounded-xl border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
                <FiLock className="text-base" />
                {message}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
};

export default LockedOverlay;
