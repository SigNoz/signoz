import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, MetricAggregateOperator } from 'types/common/queryBuilder';

export interface IServiceName {
	servicename: string;
}

export interface BuilderQueriesProps {
	autocompleteData: BaseAutocompleteData[];
	groupBy?: BaseAutocompleteData[];
	legends: string[];
	filterItems: TagFilterItem[][];
	aggregateOperator?: string[];
	dataSource: DataSource;
	queryNameAndExpression?: string[];
	timeAggregateOperators: MetricAggregateOperator[];
	spaceAggregateOperators: MetricAggregateOperator[];
}

export interface BuilderQuerieswithFormulaProps {
	autocompleteData: BaseAutocompleteData[];
	legends: string[];
	disabled: boolean[];
	groupBy?: BaseAutocompleteData[];
	expressions: string[];
	legendFormulas: string[];
	additionalItems: TagFilterItem[][];
	timeAggregateOperators: MetricAggregateOperator[];
	spaceAggregateOperators: MetricAggregateOperator[];
	dataSource: DataSource;
}
