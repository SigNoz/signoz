import React from 'react';

import Table, { ColumnsType } from 'antd/lib/table';

const TraceTable = () => {
	const columns: ColumnsType<DataProps> = [
		{
			title: 'Application',
			dataIndex: 'serviceName',
			key: 'serviceName',
		},
		{
			title: 'P99 latency (in ms)',
			dataIndex: 'p99',
			key: 'p99',
		},
		{
			title: 'Error Rate (in %)',
			dataIndex: 'errorRate',
			key: 'errorRate',
		},
		{
			title: 'Requests Per Second',
			dataIndex: 'callRate',
			key: 'callRate',
		},
	];

	return <Table columns={columns} />;
};

interface DataProps {}

export default TraceTable;
