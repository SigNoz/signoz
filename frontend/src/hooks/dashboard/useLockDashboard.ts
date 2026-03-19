import { useMutation } from 'react-query';
import locked from 'api/v1/dashboards/id/lock';
import {
	getSelectedDashboard,
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
	const { setSelectedDashboard } = useDashboardStore();

	const { mutate: lockDashboard } = useMutation(locked, {
		onSuccess: (_, props) => {
			setSelectedDashboard((prev) =>
				prev ? { ...prev, locked: props.lock } : prev,
			);
		},
		onError: (error) => {
			showErrorModal(error as APIError);
		},
	});

	return async (value: boolean): Promise<void> => {
		const selectedDashboard = getSelectedDashboard();
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
}
