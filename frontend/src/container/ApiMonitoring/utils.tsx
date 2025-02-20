import { ColumnType } from 'antd/es/table';
import {
	FiltersType,
	IQuickFiltersConfig,
} from 'components/QuickFilters/types';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

export const ApiMonitoringQuickFiltersConfig: IQuickFiltersConfig[] = [
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
		dataSource: DataSource.TRACES,
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'Service Name',
		attributeKey: {
			key: 'service.name', // discuss about this with sagar once
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: true,
			isJSON: false,
		},
		dataSource: DataSource.TRACES,
		defaultOpen: true,
	},
	{
		type: FiltersType.CHECKBOX,
		title: 'RPC Method',
		attributeKey: {
			key: 'rpc.method',
			dataType: DataTypes.String,
			type: 'tag',
			isColumn: true,
			isJSON: false,
		},
		dataSource: DataSource.TRACES,
		defaultOpen: true,
	},
];

export interface APIDomainsRowData {
	key: string;
	domainName: React.ReactNode;
	domainUID: string;
	endpointCount: React.ReactNode;
	lastUsed: React.ReactNode;
	rate: React.ReactNode;
	errorRate: React.ReactNode;
	latency: React.ReactNode;
}

const columnProgressBarClassName = 'column-progress-bar';

export const columnsConfig: ColumnType<APIDomainsRowData>[] = [
	{
		title: <div className="column-header domain-name-header">Domain</div>,
		dataIndex: 'domainName',
		key: 'domainName',
		width: 180,
		ellipsis: true,
		sorter: false,
		className: 'column column-domain-name',
	},
	{
		title: <div className="column-header med-col">Endpoints in use</div>,
		dataIndex: 'endpointCount',
		key: 'endpointCount',
		width: 180,
		ellipsis: true,
		sorter: false,
		align: 'left',
		className: `column ${columnProgressBarClassName}`,
	},
	{
		title: <div className="column-header med-col">Last used</div>,
		dataIndex: 'lastUsed',
		key: 'lastUsed',
		width: 120,
		sorter: false,
		align: 'left',
		className: `column ${columnProgressBarClassName}`,
	},
	{
		title: <div className="column-header">Rate (/s)</div>,
		dataIndex: 'rate',
		key: 'rate',
		width: 80,
		sorter: false,
		align: 'left',
		className: `column ${columnProgressBarClassName}`,
	},
	{
		title: <div className="column-heade med-col">Error rate (%)</div>,
		dataIndex: 'errorRate',
		key: 'errorRate',
		width: 120,
		sorter: false,
		align: 'left',
		className: `column ${columnProgressBarClassName}`,
	},
	{
		title: <div className="column-header med-col">Avg. Latency (ms)</div>,
		dataIndex: 'latency',
		key: 'latency',
		width: 120,
		sorter: false,
		align: 'left',
		className: `column ${columnProgressBarClassName}`,
	},
];
