import { useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

// --- Types for all API Monitoring query params ---
export interface ApiMonitoringParams {
	showIP?: boolean;
	selectedDomain?: string;
	selectedView?: string;
	selectedEndPointName?: string;
	groupBy?: string[];
	allEndpointsLocalFilters?: any;
	endPointDetailsLocalFilters?: any;
	modalTimeRange?: { startTime: number; endTime: number };
	selectedInterval?: string;
	// Add more params as needed
}

export const DEFAULT_PARAMS: ApiMonitoringParams = {
	showIP: true,
	selectedDomain: '',
	selectedView: 'all_endpoints',
	selectedEndPointName: '',
	groupBy: [],
	allEndpointsLocalFilters: undefined,
	endPointDetailsLocalFilters: undefined,
	modalTimeRange: undefined,
	selectedInterval: undefined,
};

const PARAM_KEY = 'apiMonitoringParams';

// --- Parse and serialize helpers ---
function encodeParams(params: ApiMonitoringParams): string {
	return encodeURIComponent(JSON.stringify(params));
}

function decodeParams(value: string | null): ApiMonitoringParams {
	if (!value) return DEFAULT_PARAMS;
	try {
		return JSON.parse(decodeURIComponent(value));
	} catch {
		return DEFAULT_PARAMS;
	}
}

// --- Read query params from URL ---
export function getApiMonitoringParams(search: string): ApiMonitoringParams {
	const params = new URLSearchParams(search);
	return decodeParams(params.get(PARAM_KEY));
}

// --- Set query params in URL (replace or push) ---
export function setApiMonitoringParams(
	newParams: Partial<ApiMonitoringParams>,
	search: string,
	history: ReturnType<typeof useHistory>,
	replace = false,
): void {
	const urlParams = new URLSearchParams(search);
	const current = decodeParams(urlParams.get(PARAM_KEY));
	const merged = { ...current, ...newParams };
	urlParams.set(PARAM_KEY, encodeParams(merged));
	const newSearch = `?${urlParams.toString()}`;
	if (replace) {
		history.replace({ search: newSearch });
	} else {
		history.push({ search: newSearch });
	}
}

// --- React hook to use query params in a component ---
export function useApiMonitoringParams(): [
	ApiMonitoringParams,
	(newParams: Partial<ApiMonitoringParams>, replace?: boolean) => void,
] {
	const location = useLocation();
	const history = useHistory();
	const params = getApiMonitoringParams(location.search);

	const setParams = useCallback(
		(newParams: Partial<ApiMonitoringParams>, replace = false) => {
			setApiMonitoringParams(newParams, location.search, history, replace);
		},
		[location.search, history],
	);

	return [params, setParams];
}
