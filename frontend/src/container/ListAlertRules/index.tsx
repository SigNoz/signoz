import React, { useCallback, useEffect, useState } from 'react';
import { Button, Tag, Typography, notification } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import Table, { ColumnsType } from 'antd/lib/table';

import { ButtonContainer } from './styles';
import history from 'lib/history';
import ROUTES from 'constants/routes';
import { Alerts } from 'types/api/alerts/getAll';

import Status from './TableComponents/Status';
import useFetch from 'hooks/useFetch';
import getAll from 'api/alerts/getAll';
import { PayloadProps } from 'types/api/alerts/getAll';
import Spinner from 'components/Spinner';
import { generatePath } from 'react-router';
import DeleteAlert from './DeleteAlert';

const ListAlertRules = () => {
	const onClickNewAlertHandler = useCallback(() => {
		history.push(ROUTES.ALERTS_NEW);
	}, []);

	const [notifications, Element] = notification.useNotification();

	const { loading, payload, error, errorMessage } = useFetch<
		PayloadProps,
		undefined
	>(getAll);

	const [data, setData] = useState<Alerts[]>(payload || []);

	useEffect(() => {
		if (
			loading === false &&
			payload !== undefined &&
			data.length !== payload.length
		) {
			setData(payload);
		}
	}, [loading]);

	if (loading || payload === undefined) {
		return <Spinner height="75vh" tip="Loading Rules..." />;
	}

	if (error) {
		return <div>{errorMessage}</div>;
	}

	const onEditHandler = (id: string) => {
		history.push(
			generatePath(ROUTES.EDIT_ALERTS, {
				ruleId: id,
			}),
		);
	};

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
			align: 'center',
			render: (value) => {
				const objectKeys = Object.keys(value);
				const withOutSeverityKeys = objectKeys.filter((e) => e !== 'severity');

				if (withOutSeverityKeys.length === 0) {
					return '-';
				}

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
						<DeleteAlert notifications={notifications} setData={setData} id={id} />

						<Button onClick={() => onEditHandler(id.toString())} type="link">
							Edit
						</Button>
						<Button type="link">Pause</Button>
					</>
				);
			},
		},
	];

	return (
		<>
			{Element}

			<ButtonContainer>
				<Button onClick={onClickNewAlertHandler} icon={<PlusOutlined />}>
					New Alert
				</Button>
			</ButtonContainer>

			<Table rowKey="id" columns={columns} dataSource={data} />
		</>
	);
};

export default ListAlertRules;
