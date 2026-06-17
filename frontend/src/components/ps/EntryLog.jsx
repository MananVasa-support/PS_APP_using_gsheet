import { motion } from 'framer-motion';
import { FiTrash2 } from 'react-icons/fi';
import { Card } from '@/components/ui';
import { cn } from '@/utils/cn';

/**
 * The running-list panel shown beneath a log tool's form. Each saved entry is
 * rendered by `renderItem(entry)`; an optional delete button is shown per row.
 */
export default function EntryLog({ title = 'Entries', entries, renderItem, onDelete, emptyText = 'No entries yet — add one above.' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-fg-strong">{title}</h2>
          <span className="text-xs text-ink-400">{entries.length} total</span>
        </div>

        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">{emptyText}</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={cn('flex items-start gap-3 rounded-xl border border-ink-800 bg-ink-900/40 p-3')}
              >
                <div className="min-w-0 flex-1">{renderItem(entry)}</div>
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(entry.id)}
                    className="shrink-0 rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-800 hover:text-brand-400"
                    title="Delete"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </motion.div>
  );
}
