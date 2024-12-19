import { PANEL_TYPES } from 'constants/queryBuilder';
import { EQueryType } from 'types/common/dashboard';

import {
	IBuilderFormula,
	IBuilderQuery,
	IClickHouseQuery,
	IPromQLQuery,
} from '../queryBuilder/queryBuilderData';
import { QueryData, QueryDataV3 } from '../widgets/getQuery';

export type QueryRangePayload = {
	compositeQuery: {
		builderQueries?: {
			[x: string]: IBuilderQuery | IBuilderFormula;
		};
		chQueries?: Record<string, IClickHouseQuery>;
		promQueries?: Record<string, IPromQLQuery>;
		queryType: EQueryType;
		panelType: PANEL_TYPES;
		fillGaps?: boolean;
	};
	end: number;
	start: number;
	step: number;
	variables?: Record<string, unknown>;
	formatForWeb?: boolean;
	[param: string]: unknown;
};
export interface MetricRangePayloadProps {
	data: {
		result: QueryData[];
		resultType: string;
		newResult: MetricRangePayloadV3;
	};
}

export interface MetricRangePayloadV3 {
	data: {
		result: QueryDataV3[];
		resultType: string;
	};
}
