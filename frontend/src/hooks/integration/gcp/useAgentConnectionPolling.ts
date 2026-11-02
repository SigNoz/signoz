import { useEffect, useRef } from 'react';
import { useGetAccount } from 'api/generated/services/cloudintegration';
import { CloudintegrationtypesAccountDTO } from 'api/generated/services/sigNoz.schemas';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';

export const POLL_INTERVAL_MS = 10 * 1000;
export const CONNECTION_TIMEOUT_MS = 10 * 60 * 1000;

interface UseAgentConnectionPollingProps {
	accountId: string;
	/** Polls exactly while true; the caller decides when there is an account to poll. */
	enabled: boolean;
	onConnected: (account: CloudintegrationtypesAccountDTO) => void;
	onTimeout: () => void;
	onError: () => void;
}

/**
 * Polls a GCP agent account until the agent checks in. The timeout is measured
 * from when polling gets enabled, so re-enabling it starts a fresh window.
 */
export function useAgentConnectionPolling({
	accountId,
	enabled,
	onConnected,
	onTimeout,
	onError,
}: UseAgentConnectionPollingProps): void {
	const startTimeRef = useRef<number | null>(null);

	useEffect(() => {
		startTimeRef.current = enabled ? Date.now() : null;
	}, [enabled]);

	useGetAccount(
		{ cloudProvider: INTEGRATION_TYPES.GCP, id: accountId },
		{
			query: {
				enabled,
				refetchInterval: POLL_INTERVAL_MS,
				select: (response): CloudintegrationtypesAccountDTO => response.data,
				onSuccess: (account) => {
					const isConnected =
						Boolean(account.providerAccountId) && account.removedAt === null;

					if (isConnected) {
						onConnected(account);
						return;
					}

					const startTime = startTimeRef.current ?? Date.now();
					if (Date.now() - startTime >= CONNECTION_TIMEOUT_MS) {
						onTimeout();
					}
				},
				onError: () => {
					onError();
				},
			},
		},
	);
}
