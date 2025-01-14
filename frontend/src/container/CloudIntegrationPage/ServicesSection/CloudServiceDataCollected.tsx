import { Table } from 'antd';

import { ServiceData } from './types';

function CloudServiceDataCollected({
	logsData,
	metricsData,
}: {
	logsData: ServiceData['data_collected']['logs'];
	metricsData: ServiceData['data_collected']['metrics'];
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
			<div className="cloud-service-data-collected__table">
				<div className="cloud-service-data-collected__table-heading">Logs</div>
				<Table
					columns={logsColumns}
					dataSource={logsData}
					// eslint-disable-next-line react/jsx-props-no-spreading
					{...tableProps}
					className="cloud-service-data-collected__table-logs"
				/>
			</div>
			<div className="cloud-service-data-collected__table">
				<div className="cloud-service-data-collected__table-heading">Metrics</div>
				<Table
					columns={metricsColumns}
					dataSource={metricsData}
					// eslint-disable-next-line react/jsx-props-no-spreading
					{...tableProps}
					className="cloud-service-data-collected__table-metrics"
				/>
			</div>
		</div>
	);
}

export default CloudServiceDataCollected;
