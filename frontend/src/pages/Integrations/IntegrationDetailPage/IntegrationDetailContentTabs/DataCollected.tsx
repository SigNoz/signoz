import './IntegrationDetailContentTabs.styles.scss';

import { Table, Typography } from 'antd';
import { BarChart2, ScrollText } from 'lucide-react';

interface DataCollectedProps {
	logsData: Array<any>;
	metricsData: Array<any>;
}

function DataCollected(props: DataCollectedProps): JSX.Element {
	const { logsData, metricsData } = props;
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
