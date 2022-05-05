/* eslint-disable react/display-name */
import { PlusOutlined } from '@ant-design/icons';
import { notification, Tag, Typography } from 'antd';
import Table, { ColumnsType } from 'antd/lib/table';
import TextToolTip from 'components/TextToolTip';
import ROUTES from 'constants/routes';
import useComponentPermission from 'hooks/useComponentPermission';
import useInterval from 'hooks/useInterval';
import history from 'lib/history';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UseQueryResult } from 'react-query';
import { useSelector } from 'react-redux';
import { generatePath } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Alerts } from 'types/api/alerts/getAll';
import AppReducer from 'types/reducer/app';

import DeleteAlert from './DeleteAlert';
import { Button, ButtonContainer } from './styles';
import Status from './TableComponents/Status';

function ListAlert({ allAlertRules, refetch }: ListAlertProps): JSX.Element {
	const [data, setData] = useState<Alerts[]>(allAlertRules || []);
	const { t } = useTranslation('common');
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);
	const [addNewAlert, action] = useComponentPermission(
		['add_new_alert', 'action'],
		role,
	);

	useInterval(() => {
		(async (): Promise<void> => {
			const { data: refetchData, status } = await refetch();
			if (status === 'success') {
				setData(refetchData?.payload || []);
			}
			if (status === 'error') {
				notification.error({
					message: t('something_went_wrong'),
				});
			}
		})();
	}, 30000);

	const onClickNewAlertHandler = useCallback(() => {
		history.push(ROUTES.ALERTS_NEW);
	}, []);

	const [notifications, Element] = notification.useNotification();

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
			dataIndex: 'state',
			key: 'state',
			sorter: (a, b): number =>
				b.labels.severity.length - a.labels.severity.length,
			render: (value): JSX.Element => <Status status={value} />,
		},
		{
			title: 'Alert Name',
			dataIndex: 'name',
			key: 'name',
			sorter: (a, b): number => a.name.charCodeAt(0) - b.name.charCodeAt(0),
		},
		{
			title: 'Severity',
			dataIndex: 'labels',
			key: 'severity',
			sorter: (a, b): number =>
				a.labels.severity.length - b.labels.severity.length,
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
	];

	if (action) {
		columns.push({
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
					</>
				);
			},
		});
	}

	return (
		<>
			{Element}

			<ButtonContainer>
				<TextToolTip
					{...{
						text: `More details on how to create alerts`,
						url: 'https://signoz.io/docs/userguide/alerts-management/',
					}}
				/>

				{addNewAlert && (
					<Button onClick={onClickNewAlertHandler} icon={<PlusOutlined />}>
						New Alert
					</Button>
				)}
			</ButtonContainer>

			<Table rowKey="id" columns={columns} dataSource={data} />
		</>
	);
}

interface ListAlertProps {
	allAlertRules: Alerts[];
	refetch: UseQueryResult<ErrorResponse | SuccessResponse<Alerts[]>>['refetch'];
}

export default ListAlert;
