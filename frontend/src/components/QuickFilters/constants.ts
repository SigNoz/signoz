import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';

import { QuickFiltersSource } from './types';

export const QUICK_FILTER_SOURCE_TO_SIGNAL: Record<
	QuickFiltersSource,
	TelemetrytypesSignalDTO
> = {
	[QuickFiltersSource.LOGS_EXPLORER]: TelemetrytypesSignalDTO.logs,
	[QuickFiltersSource.TRACES_EXPLORER]: TelemetrytypesSignalDTO.traces,
	[QuickFiltersSource.EXCEPTIONS]: TelemetrytypesSignalDTO.traces,
	[QuickFiltersSource.API_MONITORING]: TelemetrytypesSignalDTO.traces,
	[QuickFiltersSource.AI_OBSERVABILITY]: TelemetrytypesSignalDTO.traces,
	[QuickFiltersSource.METER_EXPLORER]: TelemetrytypesSignalDTO.metrics,
	[QuickFiltersSource.INFRA_MONITORING]: TelemetrytypesSignalDTO.metrics,
};
