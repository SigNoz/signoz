import { useCallback } from 'react';
import { useAgentCheckIn } from 'api/generated/services/cloudintegration';
import {
	CloudintegrationtypesCredentialsDTO,
	CloudintegrationtypesGCPConnectionMethodDTO,
} from 'api/generated/services/sigNoz.schemas';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import { GcpSetupFormValues } from 'container/Integrations/CloudIntegration/GoogleCloudPlatform/AddNewAccount/types';

import logEvent from '../../../api/common/logEvent';
import { useGcpAccountSetup } from './useGcpAccountSetup';

interface UseManualAccountSetupProps {
	onClose: () => void;
}

interface UseManualAccountSetup {
	isLoading: boolean;
	connectAccount: (values: GcpSetupFormValues) => Promise<void>;
	connectionParams?: CloudintegrationtypesCredentialsDTO;
	isConnectionParamsLoading: boolean;
	submitError: string | null;
	clearSubmitError: () => void;
}

export function useManualAccountSetup({
	onClose,
}: UseManualAccountSetupProps): UseManualAccountSetup {
	const {
		connectionParams,
		isConnectionParamsLoading,
		isLoading,
		submitError,
		clearSubmitError,
		createGcpAccount,
		runSubmit,
		handleConnected,
	} = useGcpAccountSetup({ onClose });

	const { mutateAsync: checkIn } = useAgentCheckIn();

	const connectAccount = useCallback(
		(values: GcpSetupFormValues): Promise<void> =>
			runSubmit(async () => {
				// Step 1: create the integration account.
				const account = await createGcpAccount(
					{
						connectionMethod: CloudintegrationtypesGCPConnectionMethodDTO.manual,
						deploymentRegion: values.deploymentRegion,
						deploymentProjectId: values.deploymentProjectId,
						projectIds: values.projectIds || [],
					},
					values,
				);

				const cloudIntegrationId = account.id;
				const providerAccountId = values.accountName;

				void logEvent('GCP Integration: Account created', {
					id: cloudIntegrationId,
				});

				// Step 2: mimic the agent by checking in from the frontend (manual flow).
				await checkIn({
					pathParams: { cloudProvider: INTEGRATION_TYPES.GCP },
					data: {
						providerAccountId,
						cloudIntegrationId,
						data: {},
					},
				});

				handleConnected({ cloudIntegrationId, providerAccountId });
			}, 'Failed to connect GCP account'),
		[checkIn, createGcpAccount, handleConnected, runSubmit],
	);

	return {
		isLoading,
		connectAccount,
		connectionParams,
		isConnectionParamsLoading,
		submitError,
		clearSubmitError,
	};
}
