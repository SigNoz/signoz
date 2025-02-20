/* eslint-disable sonarjs/no-duplicate-string */
import { Tooltip } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	FiltersType,
	IQuickFiltersConfig,
} from 'components/QuickFilters/types';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';
import { v4 } from 'uuid';

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

export const hardcodedAttributeKeys: BaseAutocompleteData[] = [
	{
		key: 'deployment.environment',
		dataType: DataTypes.String,
		type: 'resource',
		isColumn: false,
		isJSON: false,
	},
	{
		key: 'service.name', // discuss about this with sagar once
		dataType: DataTypes.String,
		type: 'resource',
		isColumn: true,
		isJSON: false,
	},
	{
		key: 'rpc.method',
		dataType: DataTypes.String,
		type: 'tag',
		isColumn: true,
		isJSON: false,
	},
];

const domainNameKey = 'net.peer.name';

interface APIMonitoringResponseRow {
	data: {
		endpoints: number;
		error_rate: number;
		lastseen: number;
		[domainNameKey]: string;
		p99: number;
		rps: number;
	};
}

interface APIDomainsRowData {
	key: string;
	domainName: React.ReactNode;
	endpointCount: React.ReactNode;
	rate: React.ReactNode;
	errorRate: React.ReactNode;
	latency: React.ReactNode;
	lastUsed: React.ReactNode;
}

export const formatDataForTable = (
	data: APIMonitoringResponseRow[],
): APIDomainsRowData[] =>
	data?.map((domain) => ({
		key: v4(),
		domainName: (
			<Tooltip title={domain.data[domainNameKey] || ''}>
				{domain.data[domainNameKey] || ''}
			</Tooltip>
		),
		endpointCount: domain.data.endpoints,
		rate: domain.data.rps,
		errorRate: domain.data.error_rate,
		latency: Math.round(domain.data.p99 / 1000000), // Convert from nanoseconds to milliseconds
		lastUsed: new Date(Math.floor(domain.data.lastseen / 1000000)).toISOString(), // Convert from nanoseconds to milliseconds
	}));
