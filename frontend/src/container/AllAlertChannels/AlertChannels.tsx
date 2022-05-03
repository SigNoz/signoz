/* eslint-disable react/display-name */
import { Button, notification, Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import ROUTES from 'constants/routes';
import useComponentPermission from 'hooks/useComponentPermission';
import history from 'lib/history';
import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { generatePath } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { Channels, PayloadProps } from 'types/api/channels/getAll';
import AppReducer from 'types/reducer/app';

import Delete from './Delete';

function AlertChannels({ allChannels }: AlertChannelsProps): JSX.Element {
	const [notifications, Element] = notification.useNotification();
	const [channels, setChannels] = useState<Channels[]>(allChannels);
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);
	const [action] = useComponentPermission(['action'], role);

	const onClickEditHandler = useCallback((id: string) => {
		history.replace(
			generatePath(ROUTES.CHANNELS_EDIT, {
				id,
			}),
		);
	}, []);

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
	];

	if (action) {
		columns.push({
			title: 'Action',
			dataIndex: 'id',
			key: 'action',
			align: 'center',
			render: (id: string): JSX.Element => (
				<>
					<Button onClick={(): void => onClickEditHandler(id)} type="link">
						Edit
					</Button>
					<Delete id={id} setChannels={setChannels} notifications={notifications} />
				</>
			),
		});
	}

	return (
		<>
			{Element}

			<Table rowKey="id" dataSource={channels} columns={columns} />
		</>
	);
}

interface AlertChannelsProps {
	allChannels: PayloadProps;
}

export default AlertChannels;
