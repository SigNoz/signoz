import { useMutation } from 'react-query';
import locked from 'api/v1/dashboards/id/lock';
import {
	getDashboardData,
	useDashboardStore,
} from 'providers/Dashboard/store/useDashboardStore';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

/**
 * Hook for toggling dashboard locked state.
 * Calls the lock API and syncs the result into the Zustand store.
 */
export function useLockDashboard(): (value: boolean) => Promise<void> {
	const { showErrorModal } = useErrorModal();
	const { setDashboardData } = useDashboardStore();

	const { mutate: lockDashboard } = useMutation(locked, {
		onSuccess: (_, props) => {
			setDashboardData((prev) => (prev ? { ...prev, locked: props.lock } : prev));
		},
		onError: (error) => {
			showErrorModal(error as APIError);
		},
	});

	return async (value: boolean): Promise<void> => {
		const dashboardData = getDashboardData();
		if (dashboardData) {
			try {
				await lockDashboard({
					id: dashboardData.id,
					lock: value,
				});
			} catch (error) {
				showErrorModal(error as APIError);
			}
		}
	};
}
