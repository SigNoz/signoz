import {
	FiltersType,
	IQuickFiltersConfig,
} from 'components/QuickFilters/types';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export const prepareQueryWithDefaultTimestamp = (query: Query): Query => ({
	...query,
	builder: {
		...query.builder,
		queryData: query.builder.queryData?.map((item) => ({
			...item,
			orderBy: [{ columnName: 'timestamp', order: 'desc' }],
		})),
	},
});

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum SELECTED_VIEWS {
	SEARCH = 'search',
	QUERY_BUILDER = 'query-builder',
	CLICKHOUSE = 'clickhouse',
}

export const LogsQuickFiltersConfig: IQuickFiltersConfig[] = [
	{
		type: FiltersType.CHECKBOX,
		title: 'Severity Text',
		attributeKey: {
			key: 'severity_text',
			dataType: DataTypes.String,
			type: '',
			isColumn: false,
			isJSON: false,
			id: 'severity_text--string----true',
		},
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Environment',
		attributeKey: {
			key: 'deployment.environment',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Service Name',
		attributeKey: {
			key: 'service.name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
			id: 'service.name--string--resource--true',
		},
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Hostname',
		attributeKey: {
			key: 'host.name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'K8s Cluster Name',
		attributeKey: {
			key: 'k8s.cluster.name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'K8s Deployment Name',
		attributeKey: {
			key: 'k8s.deployment.name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'K8s Namespace Name',
		attributeKey: {
			key: 'k8s.namespace.name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'K8s Pod Name',
		attributeKey: {
			key: 'k8s.pod.name',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: false,
			isJSON: false,
		},
		defaultOpen: false,
	},
];
