/* eslint-disable react/display-name */
import { Button, notification, Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import React, { useState } from 'react';
import { Channels, PayloadProps } from 'types/api/channels/getAll';

import Delete from './Delete';

const AlertChannels = ({ allChannels }: AlertChannelsProps): JSX.Element => {
	const [notifications, Element] = notification.useNotification();
	const [channels, setChannels] = useState<Channels[]>(allChannels);

	const columns: ColumnsType<Channels> = [
		{
			title: 'Name',
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
			render: (id): JSX.Element => (
				<>
					<Button type="link">Edit</Button>
					<Delete id={id} setChannels={setChannels} notifications={notifications} />
				</>
			),
		},
	];

	return (
		<>
			{Element}

			<Table rowKey="id" dataSource={channels} columns={columns} />
		</>
	);
};

interface AlertChannelsProps {
	allChannels: PayloadProps;
}

export default AlertChannels;
