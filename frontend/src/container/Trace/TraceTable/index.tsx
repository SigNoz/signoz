import React from 'react';

import Table, { ColumnsType } from 'antd/lib/table';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceReducer } from 'types/reducer/trace';

const TraceTable = () => {
	const { selectedTags, spansAggregate } = useSelector<AppState, TraceReducer>(
		(state) => state.traces,
	);

	const { loading } = spansAggregate;

	const columns: ColumnsType<DataProps> = [
		{
			title: 'Date',
			dataIndex: 'timestamp',
			key: 'timestamp',
		},
		{
			title: 'Service',
			dataIndex: 'serviceName',
			key: 'serviceName',
		},
		{
			title: 'Resource',
			dataIndex: 'errorRate',
			key: 'errorRate',
		},
		{
			title: 'Duration',
			dataIndex: 'durationNano',
			key: 'durationNano',
		},
		{
			title: 'Method',
			dataIndex: 'httpMethod',
			key: 'httpMethod',
		},
		{
			title: 'Status Code',
			dataIndex: 'httpCode',
			key: 'httpCode',
		},
	];

	const onChangeHandler = () => {};

	return (
		<Table
			onChange={onChangeHandler}
			dataSource={[]}
			loading={loading}
			columns={columns}
		/>
	);
};

interface DataProps {
	timestamp: string;
	spanID: string;
	traceID: string;
	serviceName: string;
	operation: string;
	durationNano: number;
	httpCode: string;
	httpMethod: string;
}

export default TraceTable;
