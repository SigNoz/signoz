import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas/telemetrytypesSignalDTO';
import type { DataSource } from 'types/common/queryBuilder';
import { SIGNAL_TO_DATA_SOURCE } from 'types/common/queryBuilder';

export function signalsToDataSources(
	signals: readonly TelemetrytypesSignalDTO[],
): DataSource[] {
	return signals
		.map((signal) => SIGNAL_TO_DATA_SOURCE[signal])
		.filter((dataSource): dataSource is DataSource => Boolean(dataSource));
}
