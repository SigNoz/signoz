import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { useGlobalTimeStore } from 'store/globalTime';

import { SelectedItemParams } from '../hooks';

interface PrimeEntityDetailsParams {
	params: SelectedItemParams;
	queryKeyPrefix: string;
	entity: unknown;
}

/**
 * Seeds the drawer's entity query with a record already in hand, so navigating
 * between resources renders straight away instead of passing through a loading
 * state. The list page does the same on a row click.
 */
export function usePrimeEntityDetails(): (
	params: PrimeEntityDetailsParams,
) => void {
	const queryClient = useQueryClient();
	const selectedTime = useGlobalTimeStore((store) => store.selectedTime);
	const getAutoRefreshQueryKey = useGlobalTimeStore(
		(store) => store.getAutoRefreshQueryKey,
	);

	return useCallback(
		({ params, queryKeyPrefix, entity }): void => {
			if (!queryKeyPrefix || !entity) {
				return;
			}

			queryClient.setQueryData(
				getAutoRefreshQueryKey(
					selectedTime,
					`${queryKeyPrefix}EntityDetails`,
					params.selectedItem,
					params.clusterName,
					params.namespaceName,
					params.containerName,
				),
				{ data: entity },
			);
		},
		[queryClient, selectedTime, getAutoRefreshQueryKey],
	);
}
