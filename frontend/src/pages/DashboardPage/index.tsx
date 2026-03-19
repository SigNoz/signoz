import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { Modal, Typography } from 'antd';
import getDashboard from 'api/v1/dashboards/id/get';
import { AxiosError } from 'axios';
import NotFound from 'components/NotFound';
import Spinner from 'components/Spinner';
import {
	DASHBOARD_CACHE_TIME,
	DASHBOARD_CACHE_TIME_ON_REFRESH_ENABLED,
} from 'constants/queryCacheTime';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import DashboardContainer from 'container/DashboardContainer';
import dayjs from 'dayjs';
import { useDashboardVariablesSelector } from 'hooks/dashboard/useDashboardVariables';
import { useTransformDashboardVariables } from 'hooks/dashboard/useTransformDashboardVariables';
import useTabVisibility from 'hooks/useTabFocus';
import { getUpdatedLayout } from 'lib/dashboard/getUpdatedLayout';
import { getMinMaxForSelectedTime } from 'lib/getMinMax';
import { defaultTo, isEqual } from 'lodash-es';
import { initializeDefaultVariables } from 'providers/Dashboard/initializeDefaultVariables';
import {
	setDashboardVariablesStore,
	updateDashboardVariablesStore,
} from 'providers/Dashboard/store/dashboardVariables/dashboardVariablesStore';
import { useDashboardStore } from 'providers/Dashboard/store/useDashboardStore';
import { sortLayout } from 'providers/Dashboard/util';
import { useErrorModal } from 'providers/ErrorModalProvider';
// eslint-disable-next-line no-restricted-imports
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_TIME_INTERVAL } from 'types/actions/globalTime';
import { SuccessResponseV2 } from 'types/api';
import { Dashboard } from 'types/api/dashboard/getAll';
import APIError from 'types/api/error';
import { ErrorType } from 'types/common';
import { GlobalReducer } from 'types/reducer/globalTime';

function DashboardPage(): JSX.Element {
	const { dashboardId } = useParams<{ dashboardId: string }>();

	const { showErrorModal } = useErrorModal();
	const dispatch = useDispatch<Dispatch<AppActions>>();
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const [onModal, Content] = Modal.useModal();

	const { setSelectedDashboard, setLayouts, setPanelMap } = useDashboardStore();
	const selectedDashboard = useDashboardStore((s) => s.selectedDashboard);
	const dashboardTitle = useDashboardStore(
		(s) => s.selectedDashboard?.data.title,
	);
	const modalRef = useRef<ReturnType<typeof onModal.confirm>>();

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
		getUrlVariables,
		updateUrlVariable,
		transformDashboardVariables,
	} = useTransformDashboardVariables(dashboardId);

	const { t } = useTranslation(['dashboard']);
	const dashboardRef = useRef<Dashboard>();
	const isVisible = useTabVisibility();

	const dashboardResponse = useQuery(
		[
			REACT_QUERY_KEY.DASHBOARD_BY_ID,
			dashboardId,
			globalTime.isAutoRefreshDisabled,
		],
		{
			enabled: !!dashboardId,
			queryFn: () => getDashboard({ id: dashboardId }),
			refetchOnWindowFocus: false,
			cacheTime: globalTime.isAutoRefreshDisabled
				? DASHBOARD_CACHE_TIME
				: DASHBOARD_CACHE_TIME_ON_REFRESH_ENABLED,
			onError: (error) => {
				showErrorModal(error as APIError);
			},
			onSuccess: (data: SuccessResponseV2<Dashboard>) => {
				const updatedDashboardData = transformDashboardVariables(data?.data);
				const updatedDate = dayjs(updatedDashboardData?.updatedAt);

				// First load: initialize everything and return
				if (!dashboardRef.current) {
					const variables = updatedDashboardData?.data?.variables;
					if (variables) {
						initializeDefaultVariables(variables, getUrlVariables, updateUrlVariable);
					}
					setSelectedDashboard(updatedDashboardData);
					dashboardRef.current = updatedDashboardData;
					setLayouts(
						sortLayout(getUpdatedLayout(updatedDashboardData?.data.layout)),
					);
					setPanelMap(defaultTo(updatedDashboardData?.data?.panelMap, {}));
					return;
				}

				// Subsequent fetches: skip if data hasn't changed
				if (!updatedDate.isAfter(dayjs(dashboardRef.current.updatedAt))) {
					return;
				}

				// Data has changed: show confirmation modal if tab is visible
				if (isVisible && dashboardRef.current.id === updatedDashboardData?.id) {
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
							setLayouts(
								sortLayout(getUpdatedLayout(updatedDashboardData?.data.layout)),
							);
							setPanelMap(defaultTo(updatedDashboardData?.data.panelMap, {}));
						},
					});
					modalRef.current = modal;
				}
			},
		},
	);

	useEffect(() => {
		if (!isVisible && modalRef.current) {
			modalRef.current.destroy();
		}
	}, [isVisible]);

	useEffect(() => {
		// make the call on tab visibility only if the user is on dashboard / widget page
		if (isVisible && dashboardRef.current) {
			dashboardResponse.refetch();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isVisible]);

	const { error, isFetching, isError, isLoading } = dashboardResponse;

	const errorMessage = isError
		? (error as AxiosError<{ errorType: string }>)?.response?.data?.errorType
		: 'Something went wrong';

	useEffect(() => {
		document.title = dashboardTitle || document.title;
	}, [dashboardTitle]);

	if (isError && !isFetching && errorMessage === ErrorType.NotFound) {
		return <NotFound />;
	}

	if (isError && errorMessage) {
		return <Typography>{errorMessage}</Typography>;
	}

	if (isLoading) {
		return <Spinner tip="Loading.." />;
	}

	return (
		<>
			{Content}
			<DashboardContainer />
		</>
	);
}

export default DashboardPage;
