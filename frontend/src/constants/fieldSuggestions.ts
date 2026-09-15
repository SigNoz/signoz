import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { DataSource } from 'types/common/queryBuilder';

export const DATA_SOURCE_TO_SIGNAL: Record<
	DataSource,
	TelemetrytypesSignalDTO
> = {
	[DataSource.METRICS]: TelemetrytypesSignalDTO.metrics,
	[DataSource.TRACES]: TelemetrytypesSignalDTO.traces,
	[DataSource.LOGS]: TelemetrytypesSignalDTO.logs,
};
