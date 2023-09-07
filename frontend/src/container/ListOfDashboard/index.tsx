import { Card } from 'antd';
import createDashboard from 'api/dashboard/create';
import { AxiosError } from 'axios';
import { ResizeTable } from 'components/ResizeTable';
import ROUTES from 'constants/routes';
import SearchFilter from 'container/ListOfDashboard/components/SearchFilter';
import { useGetAllDashboard } from 'hooks/dashboard/useGetAllDashboard';
import useComponentPermission from 'hooks/useComponentPermission';
import history from 'lib/history';
import {
	Dispatch,
	Key,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { UseQueryResult } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { generatePath } from 'react-router-dom';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GET_ALL_DASHBOARD_SUCCESS } from 'types/actions/dashboard';
import { Dashboard } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';

import DashBoardListHeader from './components/dashBoardListHeader';
import ImportJSON from './components/ImportJSON';
import { getTableDataOnFilteredData } from './helpers/listofDashBoard.helpers';
import { getDashboardListColumns } from './listOfDashboard.columns';
import { TableContainer } from './styles';

function ListOfAllDashboard(): JSX.Element {
	const [uploadedGrafana, setUploadedGrafana] = useState<boolean>(false);

	const [newDashboardState, setNewDashboardState] = useState<NewDashboardState>({
		loading: false,
		error: false,
		errorMessage: '',
	});

	const [
		isImportJSONModalVisible,
		setIsImportJSONModalVisible,
	] = useState<boolean>(false);

	const {
		data: dashboardListResponse = [],
		isLoading: isDashboardListLoading,
		refetch: refetchDashboardList,
	} = useGetAllDashboard();

	const { t } = useTranslation('dashboard');

	const dispatch = useDispatch<Dispatch<AppActions>>();
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);

	const [action, createNewDashboard, newDashboard] = useComponentPermission(
		['action', 'create_new_dashboards', 'new_dashboard'],
		role,
	);

	const [filteredDashboards, setFilteredDashboards] = useState<Dashboard[]>();

	useEffect(() => {
		if (dashboardListResponse.length) {
			setFilteredDashboards(dashboardListResponse);
		}
	}, [dashboardListResponse]);

	const dashBoardListColumn = useMemo(
		() => getDashboardListColumns(action, refetchDashboardList),
		[action, refetchDashboardList],
	);

	const data: Data[] = useMemo(
		() => getTableDataOnFilteredData(filteredDashboards),
		[filteredDashboards],
	);

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
				uploadedGrafana: false,
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

	const onModalHandler = useCallback(
		(uploadedGrafana: boolean) => (): void => {
			setIsImportJSONModalVisible((state) => !state);
			setUploadedGrafana(uploadedGrafana);
		},
		[],
	);

	return (
		<Card>
			<DashBoardListHeader
				newDashboardState={newDashboardState}
				onModalHandler={onModalHandler}
				onNewDashboardHandler={onNewDashboardHandler}
				newDashboard={newDashboard}
				isDashboardListLoading={isDashboardListLoading}
				createNewDashboard={createNewDashboard}
			/>

			{!isDashboardListLoading && (
				<SearchFilter
					searchData={dashboardListResponse}
					filterDashboards={setFilteredDashboards}
				/>
			)}

			<TableContainer>
				<ImportJSON
					isImportJSONModalVisible={isImportJSONModalVisible}
					uploadedGrafana={uploadedGrafana}
					onModalHandler={onModalHandler(false)}
				/>
				<ResizeTable
					columns={dashBoardListColumn}
					pagination={{
						pageSize: 9,
						defaultPageSize: 9,
					}}
					showHeader
					bordered
					sticky
					loading={isDashboardListLoading}
					dataSource={data}
					showSorterTooltip
				/>
			</TableContainer>
		</Card>
	);
}

export interface Data {
	key: Key;
	name: string;
	description: string;
	tags: string[];
	createdBy: string;
	lastUpdatedTime: string;
	id: string;
	refetchDashboardList: UseQueryResult['refetch'];
}

export interface NewDashboardState {
	loading: boolean;
	error: boolean;
	errorMessage: string;
}

export default ListOfAllDashboard;
