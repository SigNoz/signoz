import { Modal } from 'antd';
import get from 'api/dashboard/get';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import dayjs, { Dayjs } from 'dayjs';
import useTabVisibility from 'hooks/useTabFocus';
import {
	createContext,
	PropsWithChildren,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { Layout } from 'react-grid-layout';
import { useTranslation } from 'react-i18next';
import { useQuery, UseQueryResult } from 'react-query';
import { useSelector } from 'react-redux';
import { useRouteMatch } from 'react-router-dom';
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
	layouts: [],
	setLayouts: () => {},
	setSelectedDashboard: () => {},
	updatedTimeRef: {} as React.MutableRefObject<Dayjs | null>,
});

interface Props {
	dashboardId: string;
}

export function DashboardProvider({
	children,
}: PropsWithChildren): JSX.Element {
	const [isDashboardSliderOpen, setIsDashboardSlider] = useState<boolean>(false);
	const isDashboardPage = useRouteMatch<Props>({
		path: ROUTES.DASHBOARD,
		exact: true,
	});

	const [onModal, Content] = Modal.useModal();

	const isDashboardWidgetPage = useRouteMatch<Props>({
		path: ROUTES.DASHBOARD_WIDGET,
		exact: true,
	});

	const [layouts, setLayouts] = useState<Layout[]>([]);

	const { isLoggedIn } = useSelector<AppState, AppReducer>((state) => state.app);

	const dashboardId =
		(isDashboardPage
			? isDashboardPage.params.dashboardId
			: isDashboardWidgetPage?.params.dashboardId) || '';

	const [selectedDashboard, setSelectedDashboard] = useState<Dashboard>();

	const updatedTimeRef = useRef<Dayjs | null>(null); // Using ref to store the updated time

	const isVisible = useTabVisibility();

	const { t } = useTranslation(['dashboard']);

	const dashboardResponse = useQuery(
		[REACT_QUERY_KEY.DASHBOARD_BY_ID, isDashboardPage?.params],
		{
			enabled: (!!isDashboardPage || !!isDashboardWidgetPage) && isLoggedIn,
			queryFn: () =>
				get({
					uuid: dashboardId,
				}),
			refetchOnWindowFocus: false,
			onSuccess: (data) => {
				const updatedDate = dayjs(data.updated_at);

				// on first render
				if (updatedTimeRef.current === null) {
					setSelectedDashboard(data);

					updatedTimeRef.current = updatedDate;

					setLayouts(
						data.data.layout?.filter(
							(layout) => layout.i !== PANEL_TYPES.EMPTY_WIDGET,
						) || [],
					);
				}

				if (
					updatedTimeRef.current !== null &&
					updatedDate.isAfter(updatedTimeRef.current) &&
					isVisible
				) {
					// show modal when state is out of sync
					onModal.confirm({
						centered: true,
						title: t('dashboard_has_been_updated'),
						content: t('do_you_want_to_refresh_the_dashboard'),
						onOk() {
							setSelectedDashboard(data);

							updatedTimeRef.current = dayjs(data.updated_at);

							setLayouts(
								data.data.layout?.filter(
									(layout) => layout.i !== PANEL_TYPES.EMPTY_WIDGET,
								) || [],
							);
						},
					});
				} else {
					// normal flow
					updatedTimeRef.current = dayjs(data.updated_at);

					setSelectedDashboard(data);

					setLayouts(
						data.data.layout?.filter(
							(layout) => layout.i !== PANEL_TYPES.EMPTY_WIDGET,
						) || [],
					);
				}
			},
		},
	);

	useEffect(() => {
		if (isVisible && updatedTimeRef.current) {
			dashboardResponse.refetch();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isVisible]);

	const handleToggleDashboardSlider = (value: boolean): void => {
		setIsDashboardSlider(value);
	};

	const value: IDashboardContext = useMemo(
		() => ({
			isDashboardSliderOpen,
			handleToggleDashboardSlider,
			dashboardResponse,
			selectedDashboard,
			dashboardId,
			layouts,
			setLayouts,
			setSelectedDashboard,
			updatedTimeRef,
		}),
		[
			isDashboardSliderOpen,
			dashboardResponse,
			selectedDashboard,
			dashboardId,
			layouts,
		],
	);

	return (
		<DashboardContext.Provider value={value}>
			{Content}
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
