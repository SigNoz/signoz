import {
	FiltersType,
	IQuickFiltersConfig,
} from 'components/QuickFilters/types';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

export const ExceptionsQuickFiltersConfig: IQuickFiltersConfig[] = [
	{
		type: FiltersType.CHECKBOX,
		title: 'Environment',
		dataSource: DataSource.TRACES,
		attributeKey: {
			key: 'deployment.environment',
			dataType: DataTypes.String,
			type: 'resource',
		},
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Service Name',
		dataSource: DataSource.TRACES,
		attributeKey: {
			key: 'service.name',
			dataType: DataTypes.String,
			type: 'resource',
		},
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Hostname',
		dataSource: DataSource.TRACES,
		attributeKey: {
			key: 'host.name',
			dataType: DataTypes.String,
			type: 'resource',
		},
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'K8s Cluster Name',
		dataSource: DataSource.TRACES,
		attributeKey: {
			key: 'k8s.cluster.name',
			dataType: DataTypes.String,
			type: 'resource',
		},
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'K8s Deployment Name',
		dataSource: DataSource.TRACES,
		attributeKey: {
			key: 'k8s.deployment.name',
			dataType: DataTypes.String,
			type: 'resource',
		},
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'K8s Namespace Name',
		dataSource: DataSource.TRACES,
		attributeKey: {
			key: 'k8s.namespace.name',
			dataType: DataTypes.String,
			type: 'resource',
		},
		defaultOpen: false,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'K8s Pod Name',
		dataSource: DataSource.TRACES,
		attributeKey: {
			key: 'k8s.pod.name',
			dataType: DataTypes.String,
			type: 'resource',
		},
		defaultOpen: false,
	},
];
