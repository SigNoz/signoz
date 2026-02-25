import { PANEL_TYPES } from 'constants/queryBuilder';
import { EQueryType } from 'types/common/dashboard';

import { SuccessResponse, Warning } from '..';
import {
	IBuilderFormula,
	IBuilderQuery,
	IClickHouseQuery,
	IPromQLQuery,
} from '../queryBuilder/queryBuilderData';
import { ExecStats } from '../v5/queryRange';
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
		warnings?: string[];
	};
	meta?: ExecStats;
}

/** Query range success response including optional warning and meta */
export type MetricQueryRangeSuccessResponse = SuccessResponse<
	MetricRangePayloadProps,
	unknown
> & { warning?: Warning; meta?: ExecStats };

export interface MetricRangePayloadV3 {
	data: {
		result: QueryDataV3[];
		resultType: string;
		warnings?: string[];
	};
	warning?: Warning;
	meta?: ExecStats;
}
