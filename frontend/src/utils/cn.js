import { clsx } from 'clsx';

/**
 * Tiny helper to merge conditional Tailwind class names.
 *
 *   cn('px-2', isActive && 'bg-brand-500', { 'opacity-50': disabled })
 */
export function cn(...inputs) {
  return clsx(inputs);
}
