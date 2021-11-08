import React, { useCallback } from 'react';
import { Button, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import Table, { ColumnsType } from 'antd/lib/table';

import { ButtonContainer } from './styles';
import history from 'lib/history';
import ROUTES from 'constants/routes';
import { Alerts } from 'types/api/alerts/getAllList';

import Status from './TableComponents/Status';

const ListAlerts = () => {
	const onClickNewAlertHandler = useCallback(() => {
		history.push(ROUTES.ALERTS_NEW);
	}, []);

	const data: Alerts[] = [
		{
			labels: {
				severity: 'warning',
				asd: 'asd',
			},
			annotations: {},
			state: 'inactive',
			name: 'HighCpuLoad4',
			id: 34,
		},
		{
			labels: {
				severity: 'ok',
				asdasd1: 'asd222',
				asdasd: 'asd222',
			},
			annotations: {},
			state: 'active',
			name: 'High Network Load',
			id: 35,
		},
	];

	const columns: ColumnsType<Alerts> = [
		{
			title: 'Status',
			dataIndex: 'labels',
			key: 'labels',
			sorter: (a, b) => b.labels.severity.length - a.labels.severity.length,
			render: (value: Alerts['labels']) => {
				const objectKeys = Object.keys(value);
				// const withOutSeverityKeys = objectKeys.filter((e) => e !== 'severity');
				const withSeverityKey = objectKeys.find((e) => e === 'severity') || '';
				const severityValue = value[withSeverityKey];
				return (
					<Status
						{...{
							status: severityValue,
						}}
					/>
				);
			},
		},
		{
			title: 'Alert Name',
			dataIndex: 'name',
			key: 'name',
		},
		{
			title: 'Severity',
			dataIndex: 'labels',
			key: 'severity',
			render: (value) => {
				const objectKeys = Object.keys(value);
				const withSeverityKey = objectKeys.find((e) => e === 'severity') || '';
				const severityValue = value[withSeverityKey];

				return <Typography>{severityValue}</Typography>;
			},
		},
		{
			title: 'Tags',
			dataIndex: 'labels',
			key: 'tags',
			render: (value) => {
				const objectKeys = Object.keys(value);
				const withOutSeverityKeys = objectKeys.filter((e) => e !== 'severity');

				return (
					<>
						{withOutSeverityKeys.map((e) => {
							return <Tag color="magenta">{e}</Tag>;
						})}
					</>
				);
			},
		},
		{
			title: 'Action',
			dataIndex: 'id',
			key: 'action',
			render: (id: Alerts['id']) => {
				return (
					<>
						<Button type="link">Delete</Button>
						<Button type="link">Edit</Button>
						<Button type="link">Pause</Button>
					</>
				);
			},
		},
	];

	return (
		<>
			<ButtonContainer>
				<Button onClick={onClickNewAlertHandler} icon={<PlusOutlined />}>
					New Alert
				</Button>
			</ButtonContainer>

			<Table rowKey="id" columns={columns} dataSource={data} />
		</>
	);
};

export default ListAlerts;
