import get from 'api/dashboard/get';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import {
	createContext,
	PropsWithChildren,
	useContext,
	useMemo,
	useState,
} from 'react';
import { useQuery, UseQueryResult } from 'react-query';
import { useSelector } from 'react-redux';
import { useLocation, useRouteMatch } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { Dashboard } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';

import { IDashboardContext } from './types';

const DashboardContext = createContext<IDashboardContext>({
	isDashboardSliderOpen: false,
	handleToggleDashboardSlider: () => {},
	dashboardResponse: {} as UseQueryResult<Dashboard, unknown>,
	selectedDashboard: {} as Dashboard,
	dashboardId: '',
});

export function DashboardProvider({
	children,
}: PropsWithChildren): JSX.Element {
	const [isDashboardSliderOpen, setIsDashboardSlider] = useState<boolean>(false);
	const { pathname } = useLocation();
	const isDashboardPage = useRouteMatch({
		path: ROUTES.DASHBOARD,
		exact: true,
	});

	const { isLoggedIn } = useSelector<AppState, AppReducer>((state) => state.app);

	const pathnameArray = pathname.split('/');
	const dashboardId = pathnameArray[pathnameArray.length - 1];

	const dashboardResponse = useQuery(
		[REACT_QUERY_KEY.DASHBOARD_BY_ID, dashboardId],
		{
			enabled: !!isDashboardPage && isLoggedIn,
			queryFn: () =>
				get({
					uuid: dashboardId,
				}),
		},
	);

	const handleToggleDashboardSlider = (value: boolean): void => {
		setIsDashboardSlider(value);
	};

	const value: IDashboardContext = useMemo(
		() => ({
			isDashboardSliderOpen,
			handleToggleDashboardSlider,
			dashboardResponse,
			selectedDashboard: dashboardResponse.data,
			dashboardId,
		}),
		[isDashboardSliderOpen, dashboardResponse, dashboardId],
	);

	return (
		<DashboardContext.Provider value={value}>
			{children}
		</DashboardContext.Provider>
	);
}

export const useDashboard = (): IDashboardContext => {
	const context = useContext(DashboardContext);

	if (!context) {
		throw new Error('Should be used inside the context');
	}

	return context;
};
