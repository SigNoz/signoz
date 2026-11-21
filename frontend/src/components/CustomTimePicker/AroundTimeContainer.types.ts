import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';

export interface OffsetPreset {
	label: string;
	value: string;
}

export const CUSTOM_OFFSET_VALUE = '__custom__';

export const OFFSET_PRESETS: OffsetPreset[] = [
	{ label: '±5m', value: '5m' },
	{ label: '±15m', value: '15m' },
	{ label: '±30m', value: '30m' },
	{ label: '±1h', value: '1h' },
	{ label: '±3h', value: '3h' },
	{ label: '±6h', value: '6h' },
	{ label: '±12h', value: '12h' },
	{ label: '±1d', value: '1d' },
];

export interface AroundTimeState {
	centerDate: Date | undefined;
	centerHour: string;
	centerMinute: string;
	centerSecond: string;
	offset: string;
}

export interface AroundTimeContainerProps {
	onApply: (dateTimeRange: DateTimeRangeType) => void;
	onCancel: () => void;
	/** Exact start of the current time range — used to pre-populate the picker */
	initialFrom?: Date;
	/** Exact end of the current time range — used to pre-populate the picker */
	initialTo?: Date;
}
