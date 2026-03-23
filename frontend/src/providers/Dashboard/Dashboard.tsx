import {
	// eslint-disable-next-line no-restricted-imports
	createContext,
	PropsWithChildren,
	// eslint-disable-next-line no-restricted-imports
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { Layout } from 'react-grid-layout';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, UseQueryResult } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useDispatch, useSelector } from 'react-redux';
import { Modal } from 'antd';
import getDashboard from 'api/v1/dashboards/id/get';
import locked from 'api/v1/dashboards/id/lock';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import dayjs, { Dayjs } from 'dayjs';
import { useTransformDashboardVariables } from 'hooks/dashboard/useTransformDashboardVariables';
import useTabVisibility from 'hooks/useTabFocus';
import { getUpdatedLayout } from 'lib/dashboard/getUpdatedLayout';
import { getMinMaxForSelectedTime } from 'lib/getMinMax';
import { defaultTo } from 'lodash-es';
import isEqual from 'lodash-es/isEqual';
import isUndefined from 'lodash-es/isUndefined';
import omitBy from 'lodash-es/omitBy';
import { useAppContext } from 'providers/App/App';
import { initializeDefaultVariables } from 'providers/Dashboard/initializeDefaultVariables';
import { useErrorModal } from 'providers/ErrorModalProvider';
// eslint-disable-next-line no-restricted-imports
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_TIME_INTERVAL } from 'types/actions/globalTime';
import { SuccessResponseV2 } from 'types/api';
import { Dashboard } from 'types/api/dashboard/getAll';
import APIError from 'types/api/error';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	DASHBOARD_CACHE_TIME,
	DASHBOARD_CACHE_TIME_ON_REFRESH_ENABLED,
} from '../../constants/queryCacheTime';
import { useDashboardVariablesSelector } from '../../hooks/dashboard/useDashboardVariables';
import {
	setDashboardVariablesStore,
	updateDashboardVariablesStore,
} from './store/dashboardVariables/dashboardVariablesStore';
import { IDashboardContext, WidgetColumnWidths } from './types';
import { sortLayout } from './util';

export const DashboardContext = createContext<IDashboardContext>({
	isDashboardLocked: false,
	handleDashboardLockToggle: () => {},
	dashboardResponse: {} as UseQueryResult<
		SuccessResponseV2<Dashboard>,
		APIError
	>,
	selectedDashboard: {} as Dashboard,
	layouts: [],
	panelMap: {},
	setPanelMap: () => {},

	setLayouts: () => {},
	setSelectedDashboard: () => {},
	updatedTimeRef: {} as React.MutableRefObject<Dayjs | null>,
	updateLocalStorageDashboardVariables: () => {},
	dashboardQueryRangeCalled: false,
	setDashboardQueryRangeCalled: () => {},
	isDashboardFetching: false,
	columnWidths: {},
	setColumnWidths: () => {},
});

// eslint-disable-next-line sonarjs/cognitive-complexity
export function DashboardProvider({
	children,
	dashboardId,
}: PropsWithChildren<{ dashboardId: string }>): JSX.Element {
	const [isDashboardLocked, setIsDashboardLocked] = useState<boolean>(false);

	const [
		dashboardQueryRangeCalled,
		setDashboardQueryRangeCalled,
	] = useState<boolean>(false);

	const { showErrorModal } = useErrorModal();

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const [onModal, Content] = Modal.useModal();

	const [layouts, setLayouts] = useState<Layout[]>([]);

	const [panelMap, setPanelMap] = useState<
		Record<string, { widgets: Layout[]; collapsed: boolean }>
	>({});

	const { isLoggedIn } = useAppContext();

	const [selectedDashboard, setSelectedDashboard] = useState<Dashboard>();
	const dashboardVariables = useDashboardVariablesSelector((s) => s.variables);
	const savedDashboardId = useDashboardVariablesSelector((s) => s.dashboardId);

	useEffect(() => {
		const existingVariables = dashboardVariables;
		const updatedVariables = selectedDashboard?.data.variables || {};

		if (savedDashboardId !== dashboardId) {
			setDashboardVariablesStore({
				dashboardId,
				variables: updatedVariables,
			});
		} else if (!isEqual(existingVariables, updatedVariables)) {
			updateDashboardVariablesStore({
				dashboardId,
				variables: updatedVariables,
			});
		}
	}, [selectedDashboard]);

	const {
		currentDashboard,
		updateLocalStorageDashboardVariables,
		getUrlVariables,
		updateUrlVariable,
		transformDashboardVariables,
	} = useTransformDashboardVariables(dashboardId);

	const updatedTimeRef = useRef<Dayjs | null>(null); // Using ref to store the updated time
	const modalRef = useRef<any>(null);

	const isVisible = useTabVisibility();

	const { t } = useTranslation(['dashboard']);
	const dashboardRef = useRef<Dashboard>();

	const [isDashboardFetching, setIsDashboardFetching] = useState<boolean>(false);

	const dashboardResponse = useQuery(
		[
			REACT_QUERY_KEY.DASHBOARD_BY_ID,
			dashboardId,
			globalTime.isAutoRefreshDisabled,
		],
		{
			enabled: !!dashboardId && isLoggedIn,
			queryFn: async () => {
				setIsDashboardFetching(true);
				try {
					return await getDashboard({
						id: dashboardId,
					});
				} catch (error) {
					showErrorModal(error as APIError);
					return;
				} finally {
					setIsDashboardFetching(false);
				}
			},
			refetchOnWindowFocus: false,
			cacheTime: globalTime.isAutoRefreshDisabled
				? DASHBOARD_CACHE_TIME
				: DASHBOARD_CACHE_TIME_ON_REFRESH_ENABLED,
			onError: (error) => {
				showErrorModal(error as APIError);
			},

			onSuccess: (data: SuccessResponseV2<Dashboard>) => {
				const updatedDashboardData = transformDashboardVariables(data?.data);

				// initialize URL variables after dashboard state is set to avoid race conditions
				const variables = updatedDashboardData?.data?.variables;
				if (variables) {
					initializeDefaultVariables(variables, getUrlVariables, updateUrlVariable);
				}

				const updatedDate = dayjs(updatedDashboardData?.updatedAt);

				setIsDashboardLocked(updatedDashboardData?.locked || false);

				// on first render
				if (updatedTimeRef.current === null) {
					setSelectedDashboard(updatedDashboardData);

					updatedTimeRef.current = updatedDate;

					dashboardRef.current = updatedDashboardData;

					setLayouts(
						sortLayout(getUpdatedLayout(updatedDashboardData?.data.layout)),
					);

					setPanelMap(defaultTo(updatedDashboardData?.data?.panelMap, {}));
				}

				if (
					updatedTimeRef.current !== null &&
					updatedDate.isAfter(updatedTimeRef.current) &&
					isVisible &&
					dashboardRef.current?.id === updatedDashboardData?.id
				) {
					// show modal when state is out of sync
					const modal = onModal.confirm({
						centered: true,
						title: t('dashboard_has_been_updated'),
						content: t('do_you_want_to_refresh_the_dashboard'),
						onOk() {
							setSelectedDashboard(updatedDashboardData);

							const { maxTime, minTime } = getMinMaxForSelectedTime(
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

							dashboardRef.current = updatedDashboardData;

							updatedTimeRef.current = dayjs(updatedDashboardData?.updatedAt);

							setLayouts(
								sortLayout(getUpdatedLayout(updatedDashboardData?.data.layout)),
							);

							setPanelMap(defaultTo(updatedDashboardData?.data.panelMap, {}));
						},
					});

					modalRef.current = modal;
				} else {
					// normal flow
					updatedTimeRef.current = dayjs(updatedDashboardData?.updatedAt);

					dashboardRef.current = updatedDashboardData;

					if (!isEqual(selectedDashboard, updatedDashboardData)) {
						setSelectedDashboard(updatedDashboardData);
					}

					if (
						!isEqual(
							[omitBy(layouts, (value): boolean => isUndefined(value))[0]],
							updatedDashboardData?.data.layout,
						)
					) {
						setLayouts(
							sortLayout(getUpdatedLayout(updatedDashboardData?.data.layout)),
						);

						setPanelMap(defaultTo(updatedDashboardData?.data.panelMap, {}));
					}
				}
			},
		},
	);

	useEffect(() => {
		// make the call on tab visibility only if the user is on dashboard / widget page
		if (isVisible && updatedTimeRef.current && !!dashboardId) {
			dashboardResponse.refetch();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isVisible]);

	useEffect(() => {
		if (!isVisible && modalRef.current) {
			modalRef.current.destroy();
		}
	}, [isVisible]);

	const { mutate: lockDashboard } = useMutation(locked, {
		onSuccess: (_, props) => {
			setIsDashboardLocked(props.lock);
		},
		onError: (error) => {
			showErrorModal(error as APIError);
		},
	});

	const handleDashboardLockToggle = async (value: boolean): Promise<void> => {
		if (selectedDashboard) {
			try {
				await lockDashboard({
					id: selectedDashboard.id,
					lock: value,
				});
			} catch (error) {
				showErrorModal(error as APIError);
			}
		}
	};

	const [columnWidths, setColumnWidths] = useState<WidgetColumnWidths>({});

	const value: IDashboardContext = useMemo(
		() => ({
			isDashboardLocked,
			handleDashboardLockToggle,
			dashboardResponse,
			selectedDashboard,
			dashboardId,
			layouts,
			panelMap,
			setLayouts,
			setPanelMap,
			setSelectedDashboard,
			updatedTimeRef,
			updateLocalStorageDashboardVariables,
			dashboardQueryRangeCalled,
			setDashboardQueryRangeCalled,
			isDashboardFetching,
			columnWidths,
			setColumnWidths,
		}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			isDashboardLocked,
			dashboardResponse,
			selectedDashboard,
			dashboardId,
			layouts,
			panelMap,
			updateLocalStorageDashboardVariables,
			currentDashboard,
			dashboardQueryRangeCalled,
			setDashboardQueryRangeCalled,
			isDashboardFetching,
			columnWidths,
			setColumnWidths,
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
