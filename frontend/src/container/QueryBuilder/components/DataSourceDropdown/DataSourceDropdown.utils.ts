import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { DataSource } from 'types/common/queryBuilder';

// Partial because the signal enum also carries an empty "unset" member, which is not a
// data source a query can be built against.
const SIGNAL_TO_DATA_SOURCE: Partial<
	Record<TelemetrytypesSignalDTO, DataSource>
> = {
	[TelemetrytypesSignalDTO.logs]: DataSource.LOGS,
	[TelemetrytypesSignalDTO.metrics]: DataSource.METRICS,
	[TelemetrytypesSignalDTO.traces]: DataSource.TRACES,
};

export function signalsToDataSources(
	signals: readonly TelemetrytypesSignalDTO[],
): DataSource[] {
	return signals
		.map((signal) => SIGNAL_TO_DATA_SOURCE[signal])
		.filter((dataSource): dataSource is DataSource => Boolean(dataSource));
}
