import { SignalType } from 'components/QuickFilters/types';
import { DataSource } from 'types/common/queryBuilder';

export const SIGNAL_DATA_SOURCE_MAP = {
	[SignalType.LOGS]: DataSource.LOGS,
	[SignalType.TRACES]: DataSource.TRACES,
	[SignalType.EXCEPTIONS]: DataSource.TRACES,
	[SignalType.API_MONITORING]: DataSource.TRACES,
	[SignalType.METER_EXPLORER]: DataSource.METRICS,
	// AI Observability is a view over gen_ai spans, so it filters on traces.
	[SignalType.AI_OBSERVABILITY]: DataSource.TRACES,
};
