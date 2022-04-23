/* eslint-disable react/no-unstable-nested-components */
import { PlusOutlined } from '@ant-design/icons';
import { Card, Row, Table, TableColumnProps, Typography } from 'antd';
import createDashboard from 'api/dashboard/create';
import { AxiosError } from 'axios';
import TextToolTip from 'components/TextToolTip';
import ROUTES from 'constants/routes';
import SearchFilter from 'container/ListOfDashboard/SearchFilter';
import history from 'lib/history';
import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { generatePath } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { Dashboard } from 'types/api/dashboard/getAll';
import DashboardReducer from 'types/reducer/dashboards';
import { v4 } from 'uuid';

import { ButtonContainer, NewDashboardButton, TableContainer } from './styles';
import Createdby from './TableComponents/CreatedBy';
import DateComponent from './TableComponents/Date';
import DeleteButton from './TableComponents/DeleteButton';
import Name from './TableComponents/Name';
import Tags from './TableComponents/Tags';

function ListOfAllDashboard(): JSX.Element {
	const { dashboards, loading } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const [filteredDashboards, setFilteredDashboards] = useState<Dashboard[]>();

	useEffect(() => {
		setFilteredDashboards(dashboards);
	}, [dashboards]);
	const [newDashboardState, setNewDashboardState] = useState({
		loading: false,
		error: false,
		errorMessage: '',
	});

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
			title: 'Created At',
			dataIndex: 'createdBy',
			sorter: (a: Data, b: Data): number => {
				const prev = new Date(a.createdBy).getTime();
				const next = new Date(b.createdBy).getTime();

				return prev - next;
			},
			render: Createdby,
		},
		{
			title: 'Last Updated Time',
			dataIndex: 'lastUpdatedTime',
			sorter: (a: Data, b: Data): number => {
				const prev = new Date(a.lastUpdatedTime).getTime();
				const next = new Date(b.lastUpdatedTime).getTime();

				return prev - next;
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

	const data: Data[] = (filteredDashboards || dashboards).map((e) => ({
		createdBy: e.created_at,
		description: e.data.description || '',
		id: e.uuid,
		lastUpdatedTime: e.updated_at,
		name: e.data.title,
		tags: e.data.tags || [],
		key: e.uuid,
	}));

	const onNewDashboardHandler = useCallback(async () => {
		try {
			const newDashboardId = v4();
			setNewDashboardState({
				...newDashboardState,
				loading: true,
			});
			const response = await createDashboard({
				uuid: newDashboardId,
				title: 'Sample Title',
			});

			if (response.statusCode === 200) {
				setNewDashboardState({
					...newDashboardState,
					loading: false,
				});
				history.push(
					generatePath(ROUTES.DASHBOARD, {
						dashboardId: newDashboardId,
					}),
				);
			} else {
				setNewDashboardState({
					...newDashboardState,
					loading: false,
					error: true,
					errorMessage: response.error || 'Something went wrong',
				});
			}
		} catch (error) {
			setNewDashboardState({
				...newDashboardState,
				error: true,
				errorMessage: (error as AxiosError).toString() || 'Something went Wrong',
			});
		}
	}, [newDashboardState]);

	const getText = (): string => {
		if (!newDashboardState.error && !newDashboardState.loading) {
			return 'New Dashboard';
		}

		if (newDashboardState.loading) {
			return 'Loading';
		}

		return newDashboardState.errorMessage;
	};

	return (
		<Card>
			<Row justify="space-between">
				<Typography>Dashboard List</Typography>

				<ButtonContainer>
					<TextToolTip
						{...{
							text: `More details on how to create dashboards`,
							url: 'https://signoz.io/docs/userguide/dashboards',
						}}
					/>

					<NewDashboardButton
						onClick={onNewDashboardHandler}
						icon={<PlusOutlined />}
						type="primary"
						loading={newDashboardState.loading}
						danger={newDashboardState.error}
					>
						{getText()}
					</NewDashboardButton>
				</ButtonContainer>
			</Row>
			{!loading && (
				<SearchFilter
					searchData={dashboards}
					filterDashboards={setFilteredDashboards}
				/>
			)}

			<TableContainer>
				<Table
					pagination={{
						pageSize: 9,
						defaultPageSize: 9,
					}}
					showHeader
					bordered
					sticky
					loading={loading}
					columns={columns}
					dataSource={data}
					showSorterTooltip
				/>
			</TableContainer>
		</Card>
	);
}

export interface Data {
	key: React.Key;
	name: string;
	description: string;
	tags: string[];
	createdBy: string;
	lastUpdatedTime: string;
	id: string;
}

export default ListOfAllDashboard;
