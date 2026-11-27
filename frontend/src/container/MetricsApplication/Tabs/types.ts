import { ReactNode } from 'react';
import {
	MetrictypesComparisonSpaceAggregationParamDTO,
	MetrictypesSpaceAggregationDTO,
	MetrictypesTimeAggregationDTO,
} from 'api/generated/services/sigNoz.schemas';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import type { WidgetKeys } from '../constant';

export interface IServiceName {
	servicename: string;
}

export interface TopOperationQueryFactoryProps {
	servicename: IServiceName['servicename'];
}

export interface ExternalCallDurationByAddressProps extends ExternalCallProps {
	legend: string;
}

export interface ExternalCallProps {
	servicename: IServiceName['servicename'];
	tagFilterItems: TagFilterItem[];
}

export interface BuilderQueriesProps {
	autocompleteData: BaseAutocompleteData[];
	groupBy?: BaseAutocompleteData[];
	legends: string[];
	filterItems: TagFilterItem[][];
	aggregateOperator?: string[];
	dataSource: DataSource;
	queryNameAndExpression?: string[];
	timeAggregateOperators: MetrictypesTimeAggregationDTO[];
	spaceAggregateOperators: MetrictypesSpaceAggregationDTO[];
}

export interface BuilderQuerieswithFormulaProps {
	autocompleteData: BaseAutocompleteData[];
	legends: string[];
	disabled: boolean[];
	groupBy?: BaseAutocompleteData[];
	expressions: string[];
	legendFormulas: string[];
	additionalItems: TagFilterItem[][];
	timeAggregateOperators: MetrictypesTimeAggregationDTO[];
	spaceAggregateOperators: MetrictypesSpaceAggregationDTO[];
	comparisonSpaceAggregationParams?: (
		| MetrictypesComparisonSpaceAggregationParamDTO
		| undefined
	)[];
	dataSource: DataSource;
}

export interface OperationPerSecProps {
	servicename: IServiceName['servicename'];
	tagFilterItems: TagFilterItem[];
	topLevelOperations: string[];
}

export interface LatencyProps {
	servicename: IServiceName['servicename'];
	tagFilterItems: TagFilterItem[];
	isSpanMetricEnable?: boolean;
	topLevelOperationsRoute: string[];
}

export interface ApDexProps {
	servicename: IServiceName['servicename'];
	tagFilterItems: TagFilterItem[];
	topLevelOperationsRoute: string[];
	threshold: number;
}

export interface TableRendererProps {
	columnName: string;
	renderFunction: (record: RowData) => ReactNode;
}

export interface LatencyAtOrBelowAggregation {
	key: WidgetKeys;
	spaceAggregation: MetrictypesSpaceAggregationDTO;
	param?: MetrictypesComparisonSpaceAggregationParamDTO;
}

export interface ApDexMetricsQueryBuilderQueriesProps extends ApDexProps {
	metricsBuckets: number[];
}
