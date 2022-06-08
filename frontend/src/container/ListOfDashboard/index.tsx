import { PlusOutlined } from '@ant-design/icons';
import {
	Card,
	Dropdown,
	Menu,
	Row,
	Table,
	TableColumnProps,
	Typography,
} from 'antd';
import createDashboard from 'api/dashboard/create';
import { AxiosError } from 'axios';
import TextToolTip from 'components/TextToolTip';
import ROUTES from 'constants/routes';
import SearchFilter from 'container/ListOfDashboard/SearchFilter';
import useComponentPermission from 'hooks/useComponentPermission';
import history from 'lib/history';
import React, {
	Dispatch,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { generatePath } from 'react-router-dom';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GET_ALL_DASHBOARD_SUCCESS } from 'types/actions/dashboard';
import { Dashboard } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';
import DashboardReducer from 'types/reducer/dashboards';

import ImportJSON from './ImportJSON';
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
	const dispatch = useDispatch<Dispatch<AppActions>>();
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);

	const [action, createNewDashboard, newDashboard] = useComponentPermission(
		['action', 'create_new_dashboards', 'new_dashboard'],
		role,
	);

	const { t } = useTranslation('dashboard');
	const [
		isImportJSONModalVisible,
		setIsImportJSONModalVisible,
	] = useState<boolean>(false);

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
	];

	if (action) {
		columns.push({
			title: 'Action',
			dataIndex: '',
			key: 'x',
			render: DeleteButton,
		});
	}

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
			setNewDashboardState({
				...newDashboardState,
				loading: true,
			});
			const response = await createDashboard({
				title: t('new_dashboard_title', {
					ns: 'dashboard',
				}),
			});

			if (response.statusCode === 200) {
				dispatch({
					type: GET_ALL_DASHBOARD_SUCCESS,
					payload: [],
				});
				history.push(
					generatePath(ROUTES.DASHBOARD, {
						dashboardId: response.payload.uuid,
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
	}, [newDashboardState, t, dispatch]);

	const getText = useCallback(() => {
		if (!newDashboardState.error && !newDashboardState.loading) {
			return 'New Dashboard';
		}

		if (newDashboardState.loading) {
			return 'Loading';
		}

		return newDashboardState.errorMessage;
	}, [
		newDashboardState.error,
		newDashboardState.errorMessage,
		newDashboardState.loading,
	]);

	const onModalHandler = (): void => {
		setIsImportJSONModalVisible((state) => !state);
	};

	const menu = useMemo(
		() => (
			<Menu>
				{createNewDashboard && (
					<Menu.Item
						onClick={onNewDashboardHandler}
						disabled={loading}
						key={t('create_dashboard').toString()}
					>
						{t('create_dashboard')}
					</Menu.Item>
				)}
				<Menu.Item onClick={onModalHandler} key={t('import_json').toString()}>
					{t('import_json')}
				</Menu.Item>
			</Menu>
		),
		[createNewDashboard, loading, onNewDashboardHandler, t],
	);

	const GetHeader = useMemo(
		() => (
			<Row justify="space-between">
				<Typography>Dashboard List</Typography>

				<ButtonContainer>
					<TextToolTip
						{...{
							text: `More details on how to create dashboards`,
							url: 'https://signoz.io/docs/userguide/dashboards',
						}}
					/>
					{newDashboard && (
						<Dropdown trigger={['click']} overlay={menu}>
							<NewDashboardButton
								icon={<PlusOutlined />}
								type="primary"
								loading={newDashboardState.loading}
								danger={newDashboardState.error}
							>
								{getText()}
							</NewDashboardButton>
						</Dropdown>
					)}
				</ButtonContainer>
			</Row>
		),
		[
			getText,
			menu,
			newDashboard,
			newDashboardState.error,
			newDashboardState.loading,
		],
	);

	return (
		<Card>
			{GetHeader}

			{!loading && (
				<SearchFilter
					searchData={dashboards}
					filterDashboards={setFilteredDashboards}
				/>
			)}

			<TableContainer>
				<ImportJSON
					isImportJSONModalVisible={isImportJSONModalVisible}
					onModalHandler={onModalHandler}
				/>
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
