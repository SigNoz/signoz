import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import type { BuilderQuery } from 'types/api/v5/queryRange';

/**
 * Maps a V5 builder query's `signal` to the drilldown signal. Meter and unknown signals fall back to
 * `metrics` so the drilldown always targets a real explorer.
 */
export function resolveDrilldownSignal(
	query: BuilderQuery | undefined,
): TelemetrytypesSignalDTO {
	switch (query?.signal) {
		case 'logs':
			return TelemetrytypesSignalDTO.logs;
		case 'traces':
			return TelemetrytypesSignalDTO.traces;
		default:
			return TelemetrytypesSignalDTO.metrics;
	}
}
