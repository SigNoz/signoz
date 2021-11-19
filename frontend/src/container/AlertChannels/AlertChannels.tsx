/* eslint-disable react/display-name */
import { Button, Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import React from 'react';

const AlertChannels = (): JSX.Element => {
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
			render: (): JSX.Element => {
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
