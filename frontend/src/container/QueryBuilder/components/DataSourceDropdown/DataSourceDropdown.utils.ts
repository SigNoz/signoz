import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { DataSource, SIGNAL_TO_DATA_SOURCE } from 'types/common/queryBuilder';

export function signalsToDataSources(
	signals: readonly TelemetrytypesSignalDTO[],
): DataSource[] {
	return signals
		.map((signal) => SIGNAL_TO_DATA_SOURCE[signal])
		.filter((dataSource): dataSource is DataSource => Boolean(dataSource));
}
