import { Time } from 'container/TopNav/DateTimeSelectionV2/types';

export type CustomTimeRangeSeparator = '||_||';
export type CustomTimeRange = `${number}${CustomTimeRangeSeparator}${number}`;
export type GlobalTimeSelectedTime = Time | CustomTimeRange;

export interface IGlobalTimeStoreState {
	/**
	 * The selected time range, can be:
	 * - Relative duration: '1m', '5m', '15m', '1h', '1d', etc.
	 * - Custom range: '<minTimeUnixNano>||_||<maxTimeUnixNano>' format
	 */
	selectedTime: GlobalTimeSelectedTime;

	/**
	 * Whether auto-refresh is enabled.
	 * Automatically computed: true for duration-based times, false for custom ranges.
	 */
	isRefreshEnabled: boolean;

	/**
	 * The refresh interval in milliseconds (e.g., 5000 for 5s, 30000 for 30s)
	 * Only used when isRefreshEnabled is true
	 */
	refreshInterval: number;
}

export interface ParsedTimeRange {
	minTime: number;
	maxTime: number;
}

export interface IGlobalTimeStoreActions {
	/**
	 * Set the selected time and optionally the refresh interval.
	 * isRefreshEnabled is automatically computed:
	 * - Custom time ranges: always false
	 * - Duration times with refreshInterval > 0: true
	 * - Duration times with refreshInterval = 0: false
	 */
	setSelectedTime: (
		selectedTime: GlobalTimeSelectedTime,
		refreshInterval?: number,
	) => void;

	/**
	 * Get the current min/max time values.
	 * - Custom time ranges: returns exact parsed values
	 * - isRefreshEnabled true: computes 5s-rounded values and updates store
	 * - isRefreshEnabled false: returns lastComputedMinMax
	 */
	getMinMaxTime: () => ParsedTimeRange;
}

export interface GlobalTimeProviderOptions {
	/**
	 * Optional name for the store instance.
	 * Used to scope query keys - only queries with this store's prefix
	 * will be tracked/invalidated by this store's hooks.
	 */
	name?: string;
	/** Initialize from parent/global time */
	inheritGlobalTime?: boolean;
	/** Initial time if not inheriting */
	initialTime?: GlobalTimeSelectedTime;
	/** URL sync configuration. When false/omitted, no URL sync. */
	enableUrlParams?:
		| boolean
		| {
				relativeTimeKey?: string;
				startTimeKey?: string;
				endTimeKey?: string;
		  };
	removeQueryParamsOnUnmount?: boolean;
	localStoragePersistKey?: string;
	refreshInterval?: number;
}

export interface GlobalTimeState {
	/**
	 * Optional name for the store instance.
	 * Used to scope query keys for auto-refresh queries.
	 * Unnamed stores use the default prefix without a name.
	 */
	name?: string;
	selectedTime: GlobalTimeSelectedTime;
	refreshInterval: number;
	isRefreshEnabled: boolean;
	lastRefreshTimestamp: number;
	lastComputedMinMax: ParsedTimeRange;
}

export interface GlobalTimeActions {
	setSelectedTime: (
		time: GlobalTimeSelectedTime,
		refreshInterval?: number,
	) => void;
	setRefreshInterval: (interval: number) => void;
	getMinMaxTime: () => ParsedTimeRange;
	/**
	 * Compute fresh rounded min/max values, store them, and update refresh timestamp.
	 * Call this before invalidating queries to ensure all queries use the same time values.
	 *
	 * @returns The newly computed ParsedTimeRange
	 */
	computeAndStoreMinMax: () => ParsedTimeRange;
	/**
	 * Update the refresh timestamp to current time.
	 * Called by QueryCache listener when auto-refresh queries complete.
	 */
	updateRefreshTimestamp: () => void;
	/**
	 * Build query key for auto-refresh queries scoped to this store.
	 * Named stores: ['AUTO_REFRESH_QUERY', name, ...parts, selectedTime]
	 * Unnamed stores: ['AUTO_REFRESH_QUERY', ...parts, selectedTime]
	 */
	getAutoRefreshQueryKey: (
		selectedTime: GlobalTimeSelectedTime,
		...queryParts: unknown[]
	) => unknown[];
}

export type GlobalTimeStore = GlobalTimeState & GlobalTimeActions;
