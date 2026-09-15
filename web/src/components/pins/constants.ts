/** Small shared constants for the pins UI. */

export const DURATIONS = {
  pinTtlHours: 24,
};

export const STATUS_FILTERS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'running', label: 'Scanning' },
  { value: 'finished', label: 'Finished' },
  { value: 'expired', label: 'Expired' },
];

export const RISK_TONES = {
  clean: 'positive',
  suspicious: 'warning',
  cheating: 'negative',
} as const;
