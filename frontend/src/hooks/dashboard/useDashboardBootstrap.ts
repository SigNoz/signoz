import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
// eslint-disable-next-line no-restricted-imports
import { useDispatch, useSelector } from 'react-redux';
import { Modal } from 'antd';
import dayjs from 'dayjs';
import { useTransformDashboardVariables } from 'hooks/dashboard/useTransformDashboardVariables';
import useTabVisibility from 'hooks/useTabFocus';
import { getUpdatedLayout } from 'lib/dashboard/getUpdatedLayout';
import { getMinMaxForSelectedTime } from 'lib/getMinMax';
import { defaultTo } from 'lodash-es';
import { initializeDefaultVariables } from 'providers/Dashboard/initializeDefaultVariables';
import { useDashboardStore } from 'providers/Dashboard/store/useDashboardStore';
import { sortLayout } from 'providers/Dashboard/util';
// eslint-disable-next-line no-restricted-imports
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_TIME_INTERVAL } from 'types/actions/globalTime';
import { Dashboard } from 'types/api/dashboard/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';

import { useDashboardQuery } from './useDashboardQuery';
import { useDashboardVariablesSync } from './useDashboardVariablesSync';

interface UseDashboardBootstrapOptions {
	/** Pass `onModal.confirm` from `Modal.useModal()` to get theme-aware modals. Falls back to static `Modal.confirm`. */
	confirm?: typeof Modal.confirm;
}

export interface UseDashboardBootstrapReturn {
	isLoading: boolean;
	isError: boolean;
	isFetching: boolean;
	error: unknown;
}

export function useDashboardBootstrap(
	dashboardId: string,
	options: UseDashboardBootstrapOptions = {},
): UseDashboardBootstrapReturn {
	const confirm = options.confirm ?? Modal.confirm;

	const { t } = useTranslation(['dashboard']);
	const dispatch = useDispatch<Dispatch<AppActions>>();
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { setDashboardData, setLayouts, setPanelMap, resetDashboardStore } =
		useDashboardStore();

	const dashboardRef = useRef<Dashboard>();
	const modalRef = useRef<ReturnType<typeof Modal.confirm>>();

	const isVisible = useTabVisibility();

	const { getUrlVariables, updateUrlVariable, transformDashboardVariables } =
		useTransformDashboardVariables(dashboardId);

	// Keep the external variables store in sync with dashboardData
	useDashboardVariablesSync(dashboardId);

	const dashboardQuery = useDashboardQuery(dashboardId);

	// Handle new dashboard data: initialize on first load, detect changes on subsequent fetches.
	// React Query's structural sharing means this effect only fires when data actually changes.
	useEffect(() => {
		if (!dashboardQuery.data?.data) {
			return;
		}

		const updatedDashboardData = transformDashboardVariables(
			dashboardQuery.data.data,
		);
		const updatedDate = dayjs(updatedDashboardData?.updatedAt);

		// First load: initialize store and URL variables, then return
		if (!dashboardRef.current) {
			const variables = updatedDashboardData?.data?.variables;
			if (variables) {
				initializeDefaultVariables(variables, getUrlVariables, updateUrlVariable);
			}
			setDashboardData(updatedDashboardData);
			dashboardRef.current = updatedDashboardData;
			setLayouts(sortLayout(getUpdatedLayout(updatedDashboardData?.data.layout)));
			setPanelMap(defaultTo(updatedDashboardData?.data?.panelMap, {}));
			return;
		}

		// Subsequent fetches: skip if updatedAt hasn't advanced
		if (!updatedDate.isAfter(dayjs(dashboardRef.current.updatedAt))) {
			return;
		}

		// Data has changed: prompt user if tab is visible
		if (isVisible && dashboardRef.current.id === updatedDashboardData?.id) {
			const modal = confirm({
				centered: true,
				title: t('dashboard_has_been_updated'),
				content: t('do_you_want_to_refresh_the_dashboard'),
				onOk() {
					setDashboardData(updatedDashboardData);

					const { maxTime, minTime } = getMinMaxForSelectedTime(
						globalTime.selectedTime,
						globalTime.minTime,
						globalTime.maxTime,
					);
					dispatch({
						type: UPDATE_TIME_INTERVAL,
						payload: { maxTime, minTime, selectedTime: globalTime.selectedTime },
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dashboardQuery.data]);

	// Refetch when tab becomes visible (after initial load)
	useEffect(() => {
		if (isVisible && dashboardRef.current && !!dashboardId) {
			dashboardQuery.refetch();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isVisible]);

	// Dismiss stale modal when tab is hidden
	useEffect(() => {
		if (!isVisible && modalRef.current) {
			modalRef.current.destroy();
		}
	}, [isVisible]);

	// Reset store on unmount so stale state doesn't bleed across dashboards
	useEffect(
		() => (): void => {
			resetDashboardStore();
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	return {
		isLoading: dashboardQuery.isLoading,
		isError: dashboardQuery.isError,
		isFetching: dashboardQuery.isFetching,
		error: dashboardQuery.error,
	};
}
