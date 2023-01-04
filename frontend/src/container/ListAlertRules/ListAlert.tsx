/* eslint-disable react/display-name */
import { PlusOutlined } from '@ant-design/icons';
import { notification, Typography } from 'antd';
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
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { GettableAlert } from 'types/api/alerts/get';
import AppReducer from 'types/reducer/app';

import DeleteAlert from './DeleteAlert';
import { Button, ButtonContainer, ColumnButton, StyledTag } from './styles';
import Status from './TableComponents/Status';
import ToggleAlertState from './ToggleAlertState';

function ListAlert({ allAlertRules, refetch }: ListAlertProps): JSX.Element {
	const [data, setData] = useState<GettableAlert[]>(allAlertRules || []);
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
		history.push(`${ROUTES.EDIT_ALERTS}?ruleId=${id}`);
	};

	const columns: ColumnsType<GettableAlert> = [
		{
			title: 'Status',
			dataIndex: 'state',
			key: 'state',
			sorter: (a, b): number =>
				(b.state ? b.state.charCodeAt(0) : 1000) -
				(a.state ? a.state.charCodeAt(0) : 1000),
			render: (value): JSX.Element => <Status status={value} />,
		},
		{
			title: 'Alert Name',
			dataIndex: 'alert',
			key: 'name',
			sorter: (a, b): number =>
				(a.alert ? a.alert.charCodeAt(0) : 1000) -
				(b.alert ? b.alert.charCodeAt(0) : 1000),
			render: (value, record): JSX.Element => (
				<Typography.Link
					onClick={(): void => onEditHandler(record.id ? record.id.toString() : '')}
				>
					{value}
				</Typography.Link>
			),
		},
		{
			title: 'Severity',
			dataIndex: 'labels',
			key: 'severity',
			sorter: (a, b): number =>
				(a.labels ? a.labels.severity.length : 0) -
				(b.labels ? b.labels.severity.length : 0),
			render: (value): JSX.Element => {
				const objectKeys = Object.keys(value);
				const withSeverityKey = objectKeys.find((e) => e === 'severity') || '';
				const severityValue = value[withSeverityKey];

				return <Typography>{severityValue}</Typography>;
			},
		},
		{
			title: 'Labels',
			dataIndex: 'labels',
			key: 'tags',
			align: 'center',
			width: 350,
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
								<StyledTag key={e} color="magenta">
									{e}: {value[e]}
								</StyledTag>
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
			render: (id: GettableAlert['id'], record): JSX.Element => {
				return (
					<>
						<ToggleAlertState disabled={record.disabled} setData={setData} id={id} />

						<ColumnButton
							onClick={(): void => onEditHandler(id.toString())}
							type="link"
						>
							Edit
						</ColumnButton>

						<DeleteAlert notifications={notifications} setData={setData} id={id} />
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
	allAlertRules: GettableAlert[];
	refetch: UseQueryResult<
		ErrorResponse | SuccessResponse<GettableAlert[]>
	>['refetch'];
}

export default ListAlert;
