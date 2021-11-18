/* eslint-disable react/display-name */
import { PlusOutlined } from '@ant-design/icons';
import { Button, notification, Tag, Typography } from 'antd';
import Table, { ColumnsType } from 'antd/lib/table';
import getAll from 'api/alerts/getAll';
import Spinner from 'components/Spinner';
import ROUTES from 'constants/routes';
import useFetch from 'hooks/useFetch';
import history from 'lib/history';
import React, { useCallback, useEffect, useState } from 'react';
import { generatePath } from 'react-router';
import { Alerts } from 'types/api/alerts/getAll';
import { PayloadProps } from 'types/api/alerts/getAll';

import DeleteAlert from './DeleteAlert';
import { ButtonContainer } from './styles';
import Status from './TableComponents/Status';

const ListAlertRules = (): JSX.Element => {
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
	}, [loading, data, payload]);

	if (error) {
		return <div>{errorMessage}</div>;
	}

	if (loading || payload === undefined) {
		return <Spinner height="75vh" tip="Loading Rules..." />;
	}

	const onEditHandler = (id: string): void => {
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
			sorter: (a, b): number =>
				b.labels.severity.length - a.labels.severity.length,
			render: (value: Alerts['labels']): JSX.Element => {
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
			sorter: (a, b): number => a.name.length - b.name.length,
		},
		{
			title: 'Severity',
			dataIndex: 'labels',
			key: 'severity',
			sorter: (a, b): number =>
				a.labels['severity'].length - b.labels['severity'].length,
			render: (value): JSX.Element => {
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
			sorter: (a, b): number => {
				const alength = Object.keys(a.labels).filter((e) => e !== 'severity')
					.length;
				const blength = Object.keys(b.labels).filter((e) => e !== 'severity')
					.length;

				return blength - alength;
			},
			render: (value): JSX.Element => {
				const objectKeys = Object.keys(value);
				const withOutSeverityKeys = objectKeys.filter((e) => e !== 'severity');

				if (withOutSeverityKeys.length === 0) {
					return <Typography>-</Typography>;
				}

				return (
					<>
						{withOutSeverityKeys.map((e) => {
							return (
								<Tag key={e} color="magenta">
									{e}
								</Tag>
							);
						})}
					</>
				);
			},
		},
		{
			title: 'Action',
			dataIndex: 'id',
			key: 'action',
			render: (id: Alerts['id']): JSX.Element => {
				return (
					<>
						<DeleteAlert notifications={notifications} setData={setData} id={id} />

						<Button onClick={(): void => onEditHandler(id.toString())} type="link">
							Edit
						</Button>
						{/* <Button type="link">Pause</Button> */}
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
