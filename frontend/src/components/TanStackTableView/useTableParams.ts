import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ExpandedState, Updater } from '@tanstack/react-table';
import { parseAsInteger, useQueryState } from 'nuqs';
import { parseAsJsonNoValidate } from 'utils/nuqsParsers';

import { SortState, TanstackTableQueryParamsConfig } from './types';

const NUQS_OPTIONS = { history: 'push' as const };
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const URL_KEYS_DEFAULT = {
	page: 'page',
	limit: 'limit',
	orderBy: 'order_by',
	expanded: 'expanded',
} as const;

type Defaults = {
	page?: number;
	limit?: number;
	orderBy?: SortState | null;
	expanded?: ExpandedState;
};

type TableParamsResult = {
	page: number;
	limit: number;
	orderBy: SortState | null;
	expanded: ExpandedState;
	setPage: (p: number) => void;
	setLimit: (l: number) => void;
	setOrderBy: (s: SortState | null) => void;
	setExpanded: (updaterOrValue: Updater<ExpandedState>) => void;
};

function expandedStateToArray(state: ExpandedState): string[] {
	if (typeof state === 'boolean') {
		return [];
	}
	return Object.entries(state)
		.filter(([, v]) => v)
		.map(([k]) => k);
}

function arrayToExpandedState(arr: string[]): ExpandedState {
	const result: Record<string, boolean> = {};
	for (const id of arr) {
		result[id] = true;
	}
	return result;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function useTableParams(
	enableQueryParams?: boolean | string | TanstackTableQueryParamsConfig,
	defaults?: Defaults,
): TableParamsResult {
	// Determine which params should sync to URL vs use local state
	const isObjectConfig = typeof enableQueryParams === 'object';
	const useUrlForPage =
		enableQueryParams === true ||
		typeof enableQueryParams === 'string' ||
		(isObjectConfig && enableQueryParams.page !== undefined);
	const useUrlForLimit =
		enableQueryParams === true ||
		typeof enableQueryParams === 'string' ||
		(isObjectConfig && enableQueryParams.limit !== undefined);
	const useUrlForOrderBy =
		enableQueryParams === true ||
		typeof enableQueryParams === 'string' ||
		(isObjectConfig && enableQueryParams.orderBy !== undefined);
	const useUrlForExpanded =
		enableQueryParams === true ||
		typeof enableQueryParams === 'string' ||
		(isObjectConfig && enableQueryParams.expanded !== undefined);

	const pageQueryParam =
		typeof enableQueryParams === 'string'
			? `${enableQueryParams}_${URL_KEYS_DEFAULT.page}`
			: isObjectConfig
				? (enableQueryParams.page ?? URL_KEYS_DEFAULT.page)
				: URL_KEYS_DEFAULT.page;
	const limitQueryParam =
		typeof enableQueryParams === 'string'
			? `${enableQueryParams}_${URL_KEYS_DEFAULT.limit}`
			: isObjectConfig
				? (enableQueryParams.limit ?? URL_KEYS_DEFAULT.limit)
				: URL_KEYS_DEFAULT.limit;
	const orderByQueryParam =
		typeof enableQueryParams === 'string'
			? `${enableQueryParams}_${URL_KEYS_DEFAULT.orderBy}`
			: isObjectConfig
				? (enableQueryParams.orderBy ?? URL_KEYS_DEFAULT.orderBy)
				: URL_KEYS_DEFAULT.orderBy;
	const expandedQueryParam =
		typeof enableQueryParams === 'string'
			? `${enableQueryParams}_${URL_KEYS_DEFAULT.expanded}`
			: isObjectConfig
				? (enableQueryParams.expanded ?? URL_KEYS_DEFAULT.expanded)
				: URL_KEYS_DEFAULT.expanded;
	const pageDefault = defaults?.page ?? DEFAULT_PAGE;
	const limitDefault = defaults?.limit ?? DEFAULT_LIMIT;
	const orderByDefault = defaults?.orderBy ?? null;
	const expandedDefault = defaults?.expanded ?? {};
	const expandedDefaultArray = useMemo(
		() => expandedStateToArray(expandedDefault),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const [localPage, setLocalPage] = useState(pageDefault);
	const [localLimit, setLocalLimit] = useState(limitDefault);
	const [localOrderBy, setLocalOrderBy] = useState<SortState | null>(
		orderByDefault,
	);
	const [localExpanded, setLocalExpanded] =
		useState<ExpandedState>(expandedDefault);

	const [urlPage, setUrlPage] = useQueryState(
		pageQueryParam,
		parseAsInteger.withDefault(pageDefault).withOptions(NUQS_OPTIONS),
	);
	const [urlLimit, setUrlLimit] = useQueryState(
		limitQueryParam,
		parseAsInteger.withDefault(limitDefault).withOptions(NUQS_OPTIONS),
	);
	const [urlOrderBy, setUrlOrderBy] = useQueryState(
		orderByQueryParam,
		parseAsJsonNoValidate<SortState | null>()
			.withDefault(orderByDefault as never)
			.withOptions(NUQS_OPTIONS),
	);
	const [urlExpandedArray, setUrlExpandedArray] = useQueryState(
		expandedQueryParam,
		parseAsJsonNoValidate<string[]>()
			.withDefault(expandedDefaultArray as never)
			.withOptions(NUQS_OPTIONS),
	);

	// Convert URL array to ExpandedState
	const urlExpanded = useMemo(
		() => arrayToExpandedState(urlExpandedArray ?? []),
		[urlExpandedArray],
	);

	// Keep ref for updater function access
	const urlExpandedRef = useRef(urlExpanded);
	urlExpandedRef.current = urlExpanded;

	// Wrapper to convert ExpandedState to array when setting URL state
	// Supports both direct values and updater functions (TanStack pattern)
	const setUrlExpanded = useCallback(
		(updaterOrValue: Updater<ExpandedState>): void => {
			const newState =
				typeof updaterOrValue === 'function'
					? updaterOrValue(urlExpandedRef.current)
					: updaterOrValue;
			setUrlExpandedArray(expandedStateToArray(newState));
		},
		[setUrlExpandedArray],
	);

	// Wrapper for local expanded to match TanStack's Updater pattern
	const handleSetLocalExpanded = useCallback(
		(updaterOrValue: Updater<ExpandedState>): void => {
			setLocalExpanded((prev) =>
				typeof updaterOrValue === 'function'
					? updaterOrValue(prev)
					: updaterOrValue,
			);
		},
		[],
	);

	const orderByDefaultMemoKey = `${orderByDefault?.columnName}${orderByDefault?.order}`;
	const orderByUrlMemoKey = `${urlOrderBy?.columnName}${urlOrderBy?.order}`;

	useEffect(() => {
		if (useUrlForPage) {
			setUrlPage(pageDefault);
		} else {
			setLocalPage(pageDefault);
		}
	}, [
		useUrlForPage,
		orderByDefaultMemoKey,
		orderByUrlMemoKey,
		pageDefault,
		setUrlPage,
	]);

	return {
		page: useUrlForPage ? urlPage : localPage,
		limit: useUrlForLimit ? urlLimit : localLimit,
		orderBy: (useUrlForOrderBy ? urlOrderBy : localOrderBy) as SortState | null,
		expanded: useUrlForExpanded ? urlExpanded : localExpanded,
		setPage: useUrlForPage ? setUrlPage : setLocalPage,
		setLimit: useUrlForLimit ? setUrlLimit : setLocalLimit,
		setOrderBy: useUrlForOrderBy ? setUrlOrderBy : setLocalOrderBy,
		setExpanded: useUrlForExpanded ? setUrlExpanded : handleSetLocalExpanded,
	};
}
