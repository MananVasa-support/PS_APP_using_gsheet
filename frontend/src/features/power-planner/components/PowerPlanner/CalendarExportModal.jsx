import { createPortal } from "react-dom";
import { FiCalendar, FiCheckCircle, FiExternalLink, FiLoader } from "react-icons/fi";
import { toGoogleCalendarUrl } from "../../utils/googleCalendar";

// Export helper. Modes:
//   "pushing" → signing in / creating events via the API (spinner).
//   "pushed"  → done: N created (+ any failures).
//   "error"   → API push failed (sign-in cancelled, not configured, etc.).
//   "blocked" → link fallback: browser blocked the create-event pop-ups.
//   "empty"   → nothing dated + Self to export.
const CalendarExportModal = ({
  events = [],
  mode = "blocked",
  context,
  total = 0,
  created = 0,
  updated = 0,
  removed = 0,
  failed = [],
  message = "",
  onClose,
}) => {
  const openAll = () => {
    events.forEach((ev) => window.open(toGoogleCalendarUrl(ev), "_blank"));
    onClose?.();
  };

  // "3 added · 1 updated · 2 removed" — only the non-zero parts; else neutral.
  const summaryParts = [];
  if (created > 0) summaryParts.push(`${created} added`);
  if (updated > 0) summaryParts.push(`${updated} updated`);
  if (removed > 0) summaryParts.push(`${removed} removed`);
  const summaryText = summaryParts.length
    ? summaryParts.join(" · ")
    : "Nothing changed";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={mode === "pushing" ? undefined : onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-black bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <FiCalendar className="text-red-600" />
          <h3 className="text-base font-bold text-black">Export to Google Calendar</h3>
        </div>

        {mode === "pushing" ? (
          <div className="py-4 text-center">
            <FiLoader className="mx-auto mb-3 animate-spin text-2xl text-red-600" />
            <p className="text-sm font-semibold text-black">
              {total > 0
                ? `Adding ${total} event${total === 1 ? "" : "s"} to your calendar…`
                : "Syncing your calendar…"}
            </p>
            <p className="mt-1 text-xs text-black/60">
              Sign in / allow access in the Google popup if it appears.
            </p>
          </div>
        ) : mode === "pushed" ? (
          <>
            <div className="rounded-xl border border-black bg-zinc-50 p-5 text-center">
              <FiCheckCircle className="mx-auto mb-2 text-2xl text-red-600" />
              <p className="text-sm font-bold text-black">{summaryText}</p>
              {failed.length > 0 ? (
                <p className="mt-1 text-xs text-black/60">
                  {failed.length} couldn&apos;t be saved — check them and try again.
                </p>
              ) : (
                <p className="mt-1 text-xs text-black/60">
                  Re-exporting updates these same events — it won&apos;t create
                  duplicates.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-xl border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-black hover:border-black"
            >
              Done
            </button>
          </>
        ) : mode === "error" ? (
          <>
            <p className="text-sm text-black">
              Couldn&apos;t add the events:{" "}
              <span className="font-semibold">{message}</span>
            </p>
            <p className="mt-2 text-xs text-black/60">
              Make sure you completed Google sign-in and granted calendar access,
              then try again.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-xl border border-black bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-black hover:text-white"
            >
              Close
            </button>
          </>
        ) : mode === "empty" ? (
          <>
            {context === "otherThings" ? (
              <p className="text-sm text-black">
                Nothing to export. Each item needs a{" "}
                <span className="font-semibold">date</span> and{" "}
                <span className="font-semibold">Delegate&nbsp;To: Self</span>.
              </p>
            ) : (
              <p className="text-sm text-black">
                <span className="font-semibold">
                  Results aren&apos;t added to Google Calendar — only Actions are.
                </span>{" "}
                Add an action with a <span className="font-semibold">date</span>{" "}
                and <span className="font-semibold">Delegate&nbsp;To: Self</span>,
                then export.
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-xl border border-black bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-black hover:text-white"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-black">
              Your browser only opened the first event and blocked the rest —
              browsers allow just one pop-up per click until you permit them.
            </p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-black">
              <li>
                Click the <span className="font-semibold">pop-up blocked</span>{" "}
                icon in the address bar and choose{" "}
                <span className="font-semibold">Always allow pop-ups</span> for
                this site.
              </li>
              <li>
                Press the button below to open the remaining{" "}
                <span className="font-semibold">{events.length}</span> event
                {events.length === 1 ? "" : "s"}.
              </li>
            </ol>
            <p className="mt-2 text-xs text-black/60">
              Once allowed, every future export opens all events at once — no
              extra steps.
            </p>
            <button
              type="button"
              onClick={openAll}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-black hover:border-black"
            >
              <FiExternalLink />
              Open {events.length} create-event tab{events.length === 1 ? "" : "s"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full rounded-xl px-4 py-2 text-sm font-semibold text-black/60 hover:text-black"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default CalendarExportModal;
