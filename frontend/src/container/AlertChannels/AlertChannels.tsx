import React from 'react';
import { ColumnsType } from 'antd/lib/table';
import { Table, Button } from 'antd';

const AlertChannels = () => {
	const channels: Channels[] = [
		{
			name: 'Slack Alert Devops Channel',
			type: 'Slack',
			id: 1,
		},
		{
			name: 'Email Alert Oncall Channel',
			type: 'Email',
			id: 2,
		},
	];

	const columns: ColumnsType<Channels> = [
		{
			title: 'Status',
			dataIndex: 'name',
			key: 'name',
		},
		{
			title: 'Type',
			dataIndex: 'type',
			key: 'type',
		},
		{
			title: 'Action',
			dataIndex: 'id',
			key: 'action',
			align: 'center',
			render: () => {
				return (
					<>
						<Button type="link">Edit</Button>
						<Button type="link">Delete</Button>
					</>
				);
			},
		},
	];

	return <Table dataSource={channels} columns={columns} />;
};

interface Channels {
	name: string;
	type: string;
	id: number;
}

export default AlertChannels;
