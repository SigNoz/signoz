import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { toast } from '@signozhq/ui/sonner';
import {
	invalidateListDashboardsForUserV2,
	useMigrateDashboardV2,
} from 'api/generated/services/dashboard';
import { toAPIError } from 'utils/errorUtils';

const FAILURE_MESSAGE =
	'Could not migrate this dashboard. Please contact support.';

export interface UseRetryMigrationResult {
	// Re-run the v1 to v2 migration for a dashboard.
	retryMigration: (id: string) => void;
	isMigrating: boolean;
}

// Wraps the retry-migration mutation for a legacy (pre-v2) dashboard: refreshes
// the personalized list so the row loses its legacy flag, and reports the
// backend's reason as a toast when the dashboard still can't be converted.
export function useRetryMigration(
	onMigrated?: () => void,
): UseRetryMigrationResult {
	const queryClient = useQueryClient();

	const migrate = useMigrateDashboardV2({
		mutation: {
			onSuccess: async (): Promise<void> => {
				await invalidateListDashboardsForUserV2(queryClient);
				toast.success('Dashboard migrated to the new experience');
				onMigrated?.();
			},
			onError: (error): void => {
				toast.error(toAPIError(error, FAILURE_MESSAGE).getErrorMessage());
			},
		},
	});

	const retryMigration = useCallback(
		(id: string): void => {
			migrate.mutate({ pathParams: { id } });
		},
		[migrate],
	);

	return { retryMigration, isMigrating: migrate.isLoading };
}
