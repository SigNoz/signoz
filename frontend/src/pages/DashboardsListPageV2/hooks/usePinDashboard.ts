import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { toast } from '@signozhq/ui/sonner';
import {
	invalidateListDashboardsForUserV2,
	usePinDashboardV2,
	useUnpinDashboardV2,
} from 'api/generated/services/dashboard';
import { getHttpStatusCode } from 'utils/errorUtils';

const PIN_LIMIT_MESSAGE =
	'You can pin up to 10 dashboards. Unpin one to add another.';

export interface UsePinDashboardResult {
	// Toggle the pin for a dashboard given its current pinned state.
	togglePin: (id: string, pinned: boolean) => void;
	isUpdating: boolean;
}

// Wraps the per-user pin/unpin mutations: refreshes the personalized list on
// success and surfaces the 10-pin limit (HTTP 409) as a toast.
export function usePinDashboard(): UsePinDashboardResult {
	const queryClient = useQueryClient();

	const invalidate = useCallback((): void => {
		void invalidateListDashboardsForUserV2(queryClient);
	}, [queryClient]);

	const pin = usePinDashboardV2({
		mutation: {
			onSuccess: invalidate,
			onError: (error): void => {
				toast.error(
					getHttpStatusCode(error) === 409
						? PIN_LIMIT_MESSAGE
						: 'Failed to pin dashboard.',
				);
			},
		},
	});

	const unpin = useUnpinDashboardV2({
		mutation: {
			onSuccess: invalidate,
			onError: (): void => {
				toast.error('Failed to unpin dashboard.');
			},
		},
	});

	const togglePin = useCallback(
		(id: string, pinned: boolean): void => {
			if (pinned) {
				unpin.mutate({ pathParams: { id } });
			} else {
				pin.mutate({ pathParams: { id } });
			}
		},
		[pin, unpin],
	);

	return { togglePin, isUpdating: pin.isLoading || unpin.isLoading };
}
