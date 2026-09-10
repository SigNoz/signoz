import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { DataSource } from 'types/common/queryBuilder';

// Total, not Partial, so a signal added to the generated enum has to be mapped here
// before it compiles.
const SIGNAL_TO_DATA_SOURCE: Record<
	TelemetrytypesSignalDTO,
	DataSource | undefined
> = {
	[TelemetrytypesSignalDTO.logs]: DataSource.LOGS,
	[TelemetrytypesSignalDTO.metrics]: DataSource.METRICS,
	[TelemetrytypesSignalDTO.traces]: DataSource.TRACES,
	// The "unset" member: not a data source a query can be built against.
	[TelemetrytypesSignalDTO['']]: undefined,
};

export function signalsToDataSources(
	signals: readonly TelemetrytypesSignalDTO[],
): DataSource[] {
	return signals
		.map((signal) => SIGNAL_TO_DATA_SOURCE[signal])
		.filter((dataSource): dataSource is DataSource => Boolean(dataSource));
}
