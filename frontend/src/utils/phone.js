// Country isn't stored as its own profile column — but the signup phone carries
// the dial code (e.g. +91), so we derive the country from it. Longest-prefix wins.
export const DIAL_COUNTRIES = [
  { code: '+91', name: 'India' },
  { code: '+1', name: 'United States' },
  { code: '+44', name: 'United Kingdom' },
  { code: '+61', name: 'Australia' },
  { code: '+971', name: 'UAE' },
  { code: '+65', name: 'Singapore' },
  { code: '+49', name: 'Germany' },
  { code: '+33', name: 'France' },
  { code: '+81', name: 'Japan' },
  { code: '+86', name: 'China' },
  { code: '+92', name: 'Pakistan' },
  { code: '+880', name: 'Bangladesh' },
];

export function countryFromPhone(phone) {
  if (!phone) return '';
  const byLongest = [...DIAL_COUNTRIES].sort((a, b) => b.code.length - a.code.length);
  return byLongest.find((c) => phone.startsWith(c.code))?.name || '';
}
