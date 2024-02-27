import { Table, Typography } from 'antd';
import { BarChart2, ScrollText } from 'lucide-react';

function DataCollected(): JSX.Element {
	const logsColumns = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
			width: '30%',
		},
		{
			title: 'Path',
			dataIndex: 'path',
			key: 'path',
		},
		{
			title: 'Facet Type',
			dataIndex: 'facetType',
			key: 'facetType',
		},
		{
			title: 'Group',
			dataIndex: 'group',
			key: 'group',
		},
	];

	const logsData = [
		{
			name: 'Name',
			path: 'Path',
			facetType: 'Facet Type',
			group: 'Group',
		},
	];

	const metricsColumns = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
			width: '30%',
		},
		{
			title: 'Unit',
			dataIndex: 'unit',
			key: 'unit',
		},
		{
			title: 'Group',
			dataIndex: 'group',
			key: 'group',
		},
	];

	const metricsData = [
		{
			name: 'Name',
			unit: 'Unit',
			group: 'Group',
		},
		{
			name: 'Name',
			unit: 'Unit',
			group: 'Group',
		},
		{
			name: 'Name',
			unit: 'Unit',
			group: 'Group',
		},
		{
			name: 'Name',
			unit: 'Unit',
			group: 'Group',
		},
		{
			name: 'Name',
			unit: 'Unit',
			group: 'Group',
		},
		{
			name: 'Name',
			unit: 'Unit',
			group: 'Group',
		},
		{
			name: 'Name',
			unit: 'Unit',
			group: 'Group',
		},
		{
			name: 'Name',
			unit: 'Unit',
			group: 'Group',
		},
		{
			name: 'Name',
			unit: 'Unit',
			group: 'Group',
		},
		{
			name: 'Name',
			unit: 'Unit',
			group: 'Group',
		},
		{
			name: 'Name',
			unit: 'Unit',
			group: 'Group',
		},
		{
			name: 'Name',
			unit: 'Unit',
			group: 'Group',
		},
	];
	return (
		<div className="integration-data-collected">
			<div className="logs-section">
				<div className="logs-heading">
					<ScrollText size={14} />
					<Typography.Text>Logs</Typography.Text>
				</div>
				<Table
					columns={logsColumns}
					rowClassName={(_, index): string =>
						index % 2 === 0 ? 'table-row-dark' : ''
					}
					dataSource={logsData}
					pagination={false}
					className="logs-section-table"
				/>
			</div>
			<div className="metrics-section">
				<div className="metrics-heading">
					<BarChart2 size={14} />
					<Typography.Text>Metrics</Typography.Text>
				</div>
				<Table
					columns={metricsColumns}
					rowClassName={(_, index): string =>
						index % 2 === 0 ? 'table-row-dark' : ''
					}
					dataSource={metricsData}
					pagination={{ pageSize: 5 }}
					className="metrics-section-table"
				/>
			</div>
		</div>
	);
}

export default DataCollected;
