export interface TimeRangePresetOption {
	label: string;
	value: string;
}

// Default time-range presets offered for the public dashboard viewer.
export const TIME_RANGE_PRESETS_OPTIONS: TimeRangePresetOption[] = [
	{ label: 'Last 5 minutes', value: '5m' },
	{ label: 'Last 15 minutes', value: '15m' },
	{ label: 'Last 30 minutes', value: '30m' },
	{ label: 'Last 1 hour', value: '1h' },
	{ label: 'Last 6 hours', value: '6h' },
	{ label: 'Last 1 day', value: '24h' },
];
