import { Table } from 'antd';
import {
	CloudintegrationtypesCollectedLogAttributeDTO,
	CloudintegrationtypesCollectedMetricDTO,
} from 'api/generated/services/sigNoz.schemas';
import { BarChart2, ScrollText } from 'lucide-react';

import './CloudServiceDataCollected.styles.scss';

function CloudServiceDataCollected({
	logsData,
	metricsData,
}: {
	logsData: CloudintegrationtypesCollectedLogAttributeDTO[] | null | undefined;
	metricsData: CloudintegrationtypesCollectedMetricDTO[] | null | undefined;
}): JSX.Element {
	const logsColumns = [
		{
			title: 'NAME',
			dataIndex: 'name',
			key: 'name',
			width: '30%',
		},
		{
			title: 'PATH',
			dataIndex: 'path',
			key: 'path',
			width: '40%',
		},
		{
			title: 'FACET TYPE',
			dataIndex: 'type',
			key: 'type',
			width: '30%',
		},
	];

	const metricsColumns = [
		{
			title: 'NAME',
			dataIndex: 'name',
			key: 'name',
			width: '40%',
		},
		{
			title: 'UNIT',
			dataIndex: 'unit',
			key: 'unit',
			width: '30%',
		},
		{
			title: 'TYPE',
			dataIndex: 'type',
			key: 'type',
			width: '30%',
		},
	];

	const tableProps = {
		pagination: { pageSize: 20, hideOnSinglePage: true },
		showHeader: true,
		size: 'middle' as const,
		bordered: false,
	};

	return (
		<div className="cloud-service-data-collected">
			{logsData && logsData.length > 0 && (
				<div className="cloud-service-data-collected-table">
					<div className="cloud-service-data-collected-table-heading">
						<ScrollText size={14} />
						Logs
					</div>
					<Table
						columns={logsColumns}
						dataSource={logsData}
						{...tableProps}
						className="cloud-service-data-collected-table-logs"
					/>
				</div>
			)}
			{metricsData && metricsData.length > 0 && (
				<div className="cloud-service-data-collected-table">
					<div className="cloud-service-data-collected-table-heading">
						<BarChart2 size={14} />
						Metrics
					</div>
					<Table
						columns={metricsColumns}
						dataSource={metricsData}
						{...tableProps}
						className="cloud-service-data-collected-table-metrics"
					/>
				</div>
			)}
		</div>
	);
}

export default CloudServiceDataCollected;
