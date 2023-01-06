import { Table } from 'antd';
import React from 'react';

function SearchResult(): JSX.Element | null {
	const columns = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
		},
		{
			title: 'Age',
			dataIndex: 'age',
			key: 'age',
		},
		{
			title: 'Average Sample/s',
			dataIndex: 'avg_per_sec',
			key: 'avg_per_sec',
		},
		{
			title: 'Current Sample/s',
			dataIndex: 'current_per_sec',
			key: 'current_per_sec',
		},
		{
			title: 'Action',
			dataIndex: 'action',
			key: 'action',
		},
	];
	return <Table columns={columns} />;
}

export default SearchResult;
