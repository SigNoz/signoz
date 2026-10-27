import ROUTES from 'constants/routes';
import { DataSource } from 'types/common/queryBuilder';

export type ExplorerQueryRules = {
	dataSource: DataSource;
	/** `meter` on the meter explorer, which shares the metrics signal; '' elsewhere. */
	source: '' | 'meter';
	aiQuery: boolean;
	allowsTraceOperator: boolean;
};

const EXPLORER_QUERY_RULES: Partial<Record<string, ExplorerQueryRules>> = {
	[ROUTES.LOGS_EXPLORER]: {
		dataSource: DataSource.LOGS,
		source: '',
		aiQuery: false,
		allowsTraceOperator: false,
	},
	[ROUTES.TRACES_EXPLORER]: {
		dataSource: DataSource.TRACES,
		source: '',
		aiQuery: false,
		allowsTraceOperator: true,
	},
	[ROUTES.AI_OBSERVABILITY_EXPLORER]: {
		dataSource: DataSource.TRACES,
		source: '',
		aiQuery: true,
		allowsTraceOperator: false,
	},
	[ROUTES.METRICS_EXPLORER_EXPLORER]: {
		dataSource: DataSource.METRICS,
		source: '',
		aiQuery: false,
		allowsTraceOperator: false,
	},
	[ROUTES.METER_EXPLORER]: {
		dataSource: DataSource.METRICS,
		source: 'meter',
		aiQuery: false,
		allowsTraceOperator: false,
	},
};

export function getExplorerQueryRules(
	pathname: string,
): ExplorerQueryRules | undefined {
	return EXPLORER_QUERY_RULES[pathname];
}
