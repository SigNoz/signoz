// eslint-disable-next-line no-restricted-imports -- TODO: migrate global time selector off redux
import { useSelector } from 'react-redux';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { useGetFieldValues } from 'hooks/dynamicVariables/useGetFieldValues';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { failure, idle, loading, success, type ResolvedValues } from './types';

function signalToV1(
	signal: TelemetrytypesSignalDTO | undefined,
): 'traces' | 'logs' | 'metrics' | undefined {
	if (signal === TelemetrytypesSignalDTO.traces) {return 'traces';}
	if (signal === TelemetrytypesSignalDTO.logs) {return 'logs';}
	if (signal === TelemetrytypesSignalDTO.metrics) {return 'metrics';}
	return undefined;
}

/**
 * DYNAMIC variables: telemetry attribute lookup.
 * - `signal === undefined` → search across all telemetry types.
 * - Otherwise scoped to the specific signal.
 *
 * Uses the existing V1 hook directly; the API is V2-shape-agnostic.
 */
export function useDynamicResolver(
	attributeName: string,
	signal: TelemetrytypesSignalDTO | undefined,
): ResolvedValues {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const enabled = !!attributeName;
	const { data, isLoading, isError, error } = useGetFieldValues({
		signal: signalToV1(signal),
		name: attributeName,
		enabled,
		startUnixMilli: minTime,
		endUnixMilli: maxTime,
	});

	if (!enabled) {return idle;}
	if (isLoading) {return loading;}
	if (isError) {
		return failure(
			(error as Error)?.message ?? 'Failed to resolve dynamic variable',
		);
	}
	return success(data?.data?.normalizedValues ?? []);
}
