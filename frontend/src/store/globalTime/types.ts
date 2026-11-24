import { StoreApi } from 'zustand';
import { Time } from 'container/TopNav/DateTimeSelectionV2/types';

export type CustomTimeRangeSeparator = '||_||';
export type CustomTimeRange = `${number}${CustomTimeRangeSeparator}${number}`;
export type GlobalTimeSelectedTime = Time | CustomTimeRange;

// Forward declaration to avoid circular dependency
export type GlobalTimeStoreApiRef = StoreApi<GlobalTimeStore>;

export interface ParsedTimeRange {
	minTime: number;
	maxTime: number;
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
	/**
	 * Reference to parent store when inheritGlobalTime was used.
	 * Enables resetToParentTime() functionality.
	 */
	parentStore?: GlobalTimeStoreApiRef;
	/**
	 * Flag indicating URL params should be cleared (not synced).
	 * Set by resetToParentTime(), consumed by useUrlSync.
	 */
	shouldClearUrlParams: boolean;
}

interface GlobalTimeActions {
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
	/**
	 * Reset to parent store's time. Only works if inheritGlobalTime was used.
	 * Clears URL params and sets selectedTime to parent's value.
	 * @returns true if reset succeeded, false if no parent store
	 */
	resetToParentTime: () => boolean;
	/**
	 * Clear the shouldClearUrlParams flag after URL sync has processed it.
	 */
	clearUrlParamsFlag: () => void;
}

export type GlobalTimeStore = GlobalTimeState & GlobalTimeActions;
