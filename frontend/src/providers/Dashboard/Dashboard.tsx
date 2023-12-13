import Modal from 'antd/es/modal';
import getDashboard from 'api/dashboard/get';
import lockDashboardApi from 'api/dashboard/lockDashboard';
import unlockDashboardApi from 'api/dashboard/unlockDashboard';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import { getMinMax } from 'container/TopNav/AutoRefresh/config';
import dayjs, { Dayjs } from 'dayjs';
import useAxiosError from 'hooks/useAxiosError';
import useTabVisibility from 'hooks/useTabFocus';
import { getUpdatedLayout } from 'lib/dashboard/getUpdatedLayout';
import isEqual from 'lodash-es/isEqual';
import isUndefined from 'lodash-es/isUndefined';
import omitBy from 'lodash-es/omitBy';
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
import { useMutation, useQuery, UseQueryResult } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useRouteMatch } from 'react-router-dom';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_TIME_INTERVAL } from 'types/actions/globalTime';
import { Dashboard } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';
import { GlobalReducer } from 'types/reducer/globalTime';

import { IDashboardContext } from './types';

const DashboardContext = createContext<IDashboardContext>({
	isDashboardSliderOpen: false,
	isDashboardLocked: false,
	handleToggleDashboardSlider: () => {},
	handleDashboardLockToggle: () => {},
	dashboardResponse: {} as UseQueryResult<Dashboard, unknown>,
	selectedDashboard: {} as Dashboard,
	dashboardId: '',
	layouts: [],
	setLayouts: () => {},
	setSelectedDashboard: () => {},
	updatedTimeRef: {} as React.MutableRefObject<Dayjs | null>,
	toScrollWidgetId: '',
	setToScrollWidgetId: () => {},
});

interface Props {
	dashboardId: string;
}

export function DashboardProvider({
	children,
}: PropsWithChildren): JSX.Element {
	const [isDashboardSliderOpen, setIsDashboardSlider] = useState<boolean>(false);

	const [toScrollWidgetId, setToScrollWidgetId] = useState<string>('');

	const [isDashboardLocked, setIsDashboardLocked] = useState<boolean>(false);

	const isDashboardPage = useRouteMatch<Props>({
		path: ROUTES.DASHBOARD,
		exact: true,
	});

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

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
	const modalRef = useRef<any>(null);

	const isVisible = useTabVisibility();

	const { t } = useTranslation(['dashboard']);
	const dashboardRef = useRef<Dashboard>();

	const dashboardResponse = useQuery(
		[REACT_QUERY_KEY.DASHBOARD_BY_ID, isDashboardPage?.params],
		{
			enabled: (!!isDashboardPage || !!isDashboardWidgetPage) && isLoggedIn,
			queryFn: () =>
				getDashboard({
					uuid: dashboardId,
				}),
			refetchOnWindowFocus: false,
			onSuccess: (data) => {
				const updatedDate = dayjs(data.updated_at);

				setIsDashboardLocked(data?.isLocked || false);

				// on first render
				if (updatedTimeRef.current === null) {
					setSelectedDashboard(data);

					updatedTimeRef.current = updatedDate;

					dashboardRef.current = data;

					setLayouts(getUpdatedLayout(data.data.layout));
				}

				if (
					updatedTimeRef.current !== null &&
					updatedDate.isAfter(updatedTimeRef.current) &&
					isVisible &&
					dashboardRef.current?.id === data.id
				) {
					// show modal when state is out of sync
					const modal = onModal.confirm({
						centered: true,
						title: t('dashboard_has_been_updated'),
						content: t('do_you_want_to_refresh_the_dashboard'),
						onOk() {
							setSelectedDashboard(data);

							const { maxTime, minTime } = getMinMax(
								globalTime.selectedTime,
								globalTime.minTime,
								globalTime.maxTime,
							);

							dispatch({
								type: UPDATE_TIME_INTERVAL,
								payload: {
									maxTime,
									minTime,
									selectedTime: globalTime.selectedTime,
								},
							});

							dashboardRef.current = data;

							updatedTimeRef.current = dayjs(data.updated_at);

							setLayouts(getUpdatedLayout(data.data.layout));
						},
					});

					modalRef.current = modal;
				} else {
					// normal flow
					updatedTimeRef.current = dayjs(data.updated_at);

					dashboardRef.current = data;

					if (!isEqual(selectedDashboard, data)) {
						setSelectedDashboard(data);
					}

					if (
						!isEqual(
							[omitBy(layouts, (value): boolean => isUndefined(value))[0]],
							data.data.layout,
						)
					) {
						setLayouts(getUpdatedLayout(data.data.layout));
					}
				}
			},
		},
	);

	useEffect(() => {
		// make the call on tab visibility only if the user is on dashboard / widget page
		if (
			isVisible &&
			updatedTimeRef.current &&
			(!!isDashboardPage || !!isDashboardWidgetPage)
		) {
			dashboardResponse.refetch();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isVisible]);

	useEffect(() => {
		if (!isVisible && modalRef.current) {
			modalRef.current.destroy();
		}
	}, [isVisible]);

	const handleToggleDashboardSlider = (value: boolean): void => {
		setIsDashboardSlider(value);
	};

	const handleError = useAxiosError();

	const { mutate: lockDashboard } = useMutation(lockDashboardApi, {
		onSuccess: () => {
			setIsDashboardSlider(false);
			setIsDashboardLocked(true);
		},
		onError: handleError,
	});

	const { mutate: unlockDashboard } = useMutation(unlockDashboardApi, {
		onSuccess: () => {
			setIsDashboardLocked(false);
		},
		onError: handleError,
	});

	const handleDashboardLockToggle = async (value: boolean): Promise<void> => {
		if (selectedDashboard) {
			if (value) {
				lockDashboard(selectedDashboard);
			} else {
				unlockDashboard(selectedDashboard);
			}
		}
	};

	const value: IDashboardContext = useMemo(
		() => ({
			toScrollWidgetId,
			isDashboardSliderOpen,
			isDashboardLocked,
			handleToggleDashboardSlider,
			handleDashboardLockToggle,
			dashboardResponse,
			selectedDashboard,
			dashboardId,
			layouts,
			setLayouts,
			setSelectedDashboard,
			updatedTimeRef,
			setToScrollWidgetId,
		}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			isDashboardSliderOpen,
			isDashboardLocked,
			dashboardResponse,
			selectedDashboard,
			dashboardId,
			layouts,
			toScrollWidgetId,
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
