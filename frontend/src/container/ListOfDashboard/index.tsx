import { PlusOutlined } from '@ant-design/icons';
import { Row, Table, TableColumnProps, Typography } from 'antd';
import ROUTES from 'constants/routes';
import updateUrl from 'lib/updateUrl';
import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { PayloadProps as APIAllDashboardReponse } from 'types/api/dashboard/getAll';
import { v4 } from 'uuid';

import { NewDashboardButton, TableContainer } from './styles';
import DateComponent from './TableComponents/Date';
import DeleteButton from './TableComponents/DeleteButton';
import Name from './TableComponents/Name';
import Tags from './TableComponents/Tags';

const ListOfAllDashboard = ({
	listOfDashboards,
}: ListOfAllDashboardProps): JSX.Element => {
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

	const data: Data[] = listOfDashboards.map((e) => ({
		createdBy: e.created_at,
		description: e.data.description,
		id: e.id,
		lastUpdatedTime: e.updated_at,
		name: e.data.name,
		tags: e.data.tags,
		key: e.uuid,
	}));

	const onNewDashboardHandler = useCallback(() => {
		// TODO create the dashboard in the dashboard
		const newDashboardId = v4();
		push(updateUrl(ROUTES.DASHBOARD, ':dashboardId', newDashboardId));
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

interface ListOfAllDashboardProps {
	listOfDashboards: APIAllDashboardReponse;
}

export default ListOfAllDashboard;
