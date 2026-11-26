import { TelemetrytypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import ROUTES from 'constants/routes';
import { EQueryType } from 'types/common/dashboard';
import { BuilderQuerySource, DataSource } from 'types/common/queryBuilder';

export type ExplorerQueryRules = {
	dataSource: DataSource;
	/** `meter` on the meter explorer, which shares the metrics signal; '' elsewhere. */
	source: BuilderQuerySource;
	/** AI_QUERY_BUILDER on the AI explorer, whose queries live in the AI slot. */
	queryType: EQueryType.QUERY_BUILDER | EQueryType.AI_QUERY_BUILDER;
	allowsTraceOperator: boolean;
};

const EXPLORER_QUERY_RULES: Partial<Record<string, ExplorerQueryRules>> = {
	[ROUTES.LOGS_EXPLORER]: {
		dataSource: DataSource.LOGS,
		source: '',
		queryType: EQueryType.QUERY_BUILDER,
		allowsTraceOperator: false,
	},
	[ROUTES.TRACES_EXPLORER]: {
		dataSource: DataSource.TRACES,
		source: '',
		queryType: EQueryType.QUERY_BUILDER,
		allowsTraceOperator: true,
	},
	[ROUTES.AI_OBSERVABILITY_EXPLORER]: {
		dataSource: DataSource.TRACES,
		source: '',
		queryType: EQueryType.AI_QUERY_BUILDER,
		allowsTraceOperator: false,
	},
	[ROUTES.METRICS_EXPLORER_EXPLORER]: {
		dataSource: DataSource.METRICS,
		source: '',
		queryType: EQueryType.QUERY_BUILDER,
		allowsTraceOperator: false,
	},
	[ROUTES.METER_EXPLORER]: {
		dataSource: DataSource.METRICS,
		source: TelemetrytypesSourceDTO.meter,
		queryType: EQueryType.QUERY_BUILDER,
		allowsTraceOperator: false,
	},
};

export function getExplorerQueryRules(
	pathname: string,
): ExplorerQueryRules | undefined {
	return EXPLORER_QUERY_RULES[pathname];
}
