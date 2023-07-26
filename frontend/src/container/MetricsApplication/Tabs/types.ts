import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { ReactNode } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, MetricAggregateOperator } from 'types/common/queryBuilder';

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
}

export interface BuilderQuerieswithFormulaProps {
	autocompleteData: BaseAutocompleteData[];
	legends: string[];
	disabled: boolean[];
	groupBy?: BaseAutocompleteData[];
	expression: string;
	legendFormula: string;
	additionalItems: TagFilterItem[][];
	aggregateOperators: MetricAggregateOperator[];
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

export interface TableRendererProps {
	columnName: string;
	renderFunction: (record: RowData) => ReactNode;
}
