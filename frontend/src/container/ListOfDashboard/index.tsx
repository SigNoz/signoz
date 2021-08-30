import { PlusOutlined } from '@ant-design/icons';
import { Row, Table, TableColumnProps, Typography } from 'antd';
import ROUTES from 'constants/routes';
import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';

import { NewDashboardButton, TableContainer } from './styles';
import DateComponent from './TableComponents/Date';
import DeleteButton from './TableComponents/DeleteButton';
import Name from './TableComponents/Name';
import Tags from './TableComponents/Tags';

const ListOfAllDashboard = (): JSX.Element => {
	const { push } = useHistory();

	const columns: TableColumnProps<Data>[] = [
		{
			title: 'Name',
			dataIndex: 'name',
			render: Name,
		},
		{
			title: 'Description',
			dataIndex: 'description',
		},
		{
			title: 'Tags (can be multiple)',
			dataIndex: 'tags',
			render: Tags,
		},
		{
			title: 'Created By',
			dataIndex: 'createdBy',
		},
		{
			title: 'Last Updated Time',
			dataIndex: 'lastUpdatedTime',
			sorter: (a: Data, b: Data): number => {
				return parseInt(a.lastUpdatedTime, 10) - parseInt(b.lastUpdatedTime, 10);
			},
			render: DateComponent,
		},
		{
			title: 'Action',
			dataIndex: '',
			key: 'x',
			render: DeleteButton,
		},
	];

	const data: Data[] = [
		{
			key: '1',
			name: 'TradeCode 99',
			description: 'Vel cras auctor at tortor imperdiet amet id sed rhoncus.',
			tags: ['cpu', 'node'],
			createdBy: 'Palash',
			lastUpdatedTime: new Date().getTime().toString(),
			id: 1,
		},
		{
			key: '2',
			name: 'TradeCode 99',
			description: 'Vel cras auctor at tortor imperdiet amet id sed rhoncus.',
			tags: ['cpu', 'node'],
			createdBy: 'Palash',
			lastUpdatedTime: new Date().getTime().toString(),
			id: 2,
		},
		{
			key: '3',
			name: 'TradeCode 99',
			description: 'Vel cras auctor at tortor imperdiet amet id sed rhoncus.',
			tags: ['cpu', 'node'],
			createdBy: 'Palash',
			lastUpdatedTime: new Date().getTime().toString(),
			id: 3,
		},
		{
			key: '4',
			name: 'TradeCode 99',
			description: 'Vel cras auctor at tortor imperdiet amet id sed rhoncus.',
			tags: ['cpu', 'node'],
			createdBy: 'Palash',
			lastUpdatedTime: new Date().getTime().toString(),
			id: 4,
		},
	];

	const onNewDashboardHandler = useCallback(() => {
		push(ROUTES.NEW_DASHBOARD);
	}, []);

	return (
		<TableContainer>
			<Table
				pagination={{
					pageSize: 9,
					defaultPageSize: 9,
				}}
				showHeader
				bordered
				sticky
				title={(): JSX.Element => {
					return (
						<Row justify="space-between">
							<Typography>Dashboard List</Typography>
							<NewDashboardButton
								onClick={onNewDashboardHandler}
								icon={<PlusOutlined />}
								type="primary"
							>
								New Dashboard
							</NewDashboardButton>
						</Row>
					);
				}}
				columns={columns}
				dataSource={data}
				showSorterTooltip
			/>
		</TableContainer>
	);
};

export interface Data {
	key: React.Key;
	name: string;
	description: string;
	tags: string[];
	createdBy: string;
	lastUpdatedTime: string;
	id: number;
}

export default ListOfAllDashboard;
