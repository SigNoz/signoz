import {
	DashboardtypesDynamicVariableSignalDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
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

/**
 * Maps a clicked query's telemetry signal to a dynamic-variable signal (used
 * when a drilldown seeds a new variable). Concrete signals map 1:1; an unset
 * signal (no active drilldown) falls back to `all`.
 */
export function dynamicSignalFromQuerySignal(
	signal?: TelemetrytypesSignalDTO,
): DashboardtypesDynamicVariableSignalDTO {
	switch (signal) {
		case TelemetrytypesSignalDTO.traces:
			return DashboardtypesDynamicVariableSignalDTO.traces;
		case TelemetrytypesSignalDTO.logs:
			return DashboardtypesDynamicVariableSignalDTO.logs;
		case TelemetrytypesSignalDTO.metrics:
			return DashboardtypesDynamicVariableSignalDTO.metrics;
		default:
			return DashboardtypesDynamicVariableSignalDTO.all;
	}
}
