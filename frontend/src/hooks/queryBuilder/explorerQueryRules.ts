import {
	Querybuildertypesv5QueryTypeDTO,
	TelemetrytypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import ROUTES from 'constants/routes';
import { BuilderQueryType } from 'types/api/v5/queryRange';
import { BuilderQuerySource, DataSource } from 'types/common/queryBuilder';

export type ExplorerQueryRules = {
	dataSource: DataSource;
	/** `meter` on the meter explorer, which shares the metrics signal; '' elsewhere. */
	source: BuilderQuerySource;
	builderQueryType: BuilderQueryType;
	allowsTraceOperator: boolean;
};

const EXPLORER_QUERY_RULES: Partial<Record<string, ExplorerQueryRules>> = {
	[ROUTES.LOGS_EXPLORER]: {
		dataSource: DataSource.LOGS,
		source: '',
		builderQueryType: Querybuildertypesv5QueryTypeDTO.builder_query,
		allowsTraceOperator: false,
	},
	[ROUTES.TRACES_EXPLORER]: {
		dataSource: DataSource.TRACES,
		source: '',
		builderQueryType: Querybuildertypesv5QueryTypeDTO.builder_query,
		allowsTraceOperator: true,
	},
	[ROUTES.AI_OBSERVABILITY_EXPLORER]: {
		dataSource: DataSource.TRACES,
		source: '',
		builderQueryType: Querybuildertypesv5QueryTypeDTO.builder_ai_query,
		allowsTraceOperator: false,
	},
	[ROUTES.METRICS_EXPLORER_EXPLORER]: {
		dataSource: DataSource.METRICS,
		source: '',
		builderQueryType: Querybuildertypesv5QueryTypeDTO.builder_query,
		allowsTraceOperator: false,
	},
	[ROUTES.METER_EXPLORER]: {
		dataSource: DataSource.METRICS,
		source: TelemetrytypesSourceDTO.meter,
		builderQueryType: Querybuildertypesv5QueryTypeDTO.builder_query,
		allowsTraceOperator: false,
	},
};

export function getExplorerQueryRules(
	pathname: string,
): ExplorerQueryRules | undefined {
	return EXPLORER_QUERY_RULES[pathname];
}
