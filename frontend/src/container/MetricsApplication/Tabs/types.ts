import { ReactNode } from 'react';
import { MetrictypesComparisonSpaceAggregationParamDTO } from 'api/generated/services/sigNoz.schemas';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import type {
	SpaceAggregation,
	TimeAggregation,
} from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

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
	timeAggregateOperators: TimeAggregation[];
	spaceAggregateOperators: SpaceAggregation[];
}

export interface BuilderQuerieswithFormulaProps {
	autocompleteData: BaseAutocompleteData[];
	legends: string[];
	disabled: boolean[];
	groupBy?: BaseAutocompleteData[];
	expressions: string[];
	legendFormulas: string[];
	additionalItems: TagFilterItem[][];
	timeAggregateOperators: TimeAggregation[];
	spaceAggregateOperators: SpaceAggregation[];
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
	threashold: number;
}

export interface TableRendererProps {
	columnName: string;
	renderFunction: (record: RowData) => ReactNode;
}

export interface ApDexMetricsQueryBuilderQueriesProps extends ApDexProps {
	metricsBuckets: number[];
}
