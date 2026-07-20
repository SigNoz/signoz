import { useCallback, useState } from 'react';
import { useQueryClient } from 'react-query';
import { toast } from '@signozhq/ui/sonner';
import {
	CreateAccountMutationResult,
	GetConnectionCredentialsQueryResult,
	invalidateListAccounts,
	useAgentCheckIn,
	useCreateAccount,
	useGetConnectionCredentials,
} from 'api/generated/services/cloudintegration';
import {
	CloudintegrationtypesCredentialsDTO,
	CloudintegrationtypesPostableAccountDTO,
} from 'api/generated/services/sigNoz.schemas';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import { GcpSetupFormValues } from 'container/Integrations/CloudIntegration/GoogleCloudPlatform/AddNewAccount/types';
import useAxiosError from 'hooks/useAxiosError';

import logEvent from '../../../api/common/logEvent';

interface UseIntegrationModalProps {
	onClose: () => void;
}

interface UseGCPIntegrationModal {
	isLoading: boolean;
	connectAccount: (values: GcpSetupFormValues) => Promise<void>;
	handleClose: () => void;
	connectionParams?: CloudintegrationtypesCredentialsDTO;
	isConnectionParamsLoading: boolean;
}

export function useIntegrationModal({
	onClose,
}: UseIntegrationModalProps): UseGCPIntegrationModal {
	const queryClient = useQueryClient();
	const [isLoading, setIsLoading] = useState(false);

	const { mutateAsync: createAccount } = useCreateAccount();
	const { mutateAsync: checkIn } = useAgentCheckIn();
	const handleError = useAxiosError();

	const { data: connectionParams, isLoading: isConnectionParamsLoading } =
		useGetConnectionCredentials<GetConnectionCredentialsQueryResult>(
			{
				cloudProvider: INTEGRATION_TYPES.GCP,
			},
			{
				query: {
					onError: handleError,
				},
			},
		);

	const handleClose = useCallback((): void => {
		onClose();
	}, [onClose]);

	const handleConnectionSuccess = useCallback(
		(payload: {
			cloudIntegrationId: string;
			providerAccountId: string;
		}): void => {
			void logEvent('GCP Integration: Account connected', {
				cloudIntegrationId: payload.cloudIntegrationId,
				providerAccountId: payload.providerAccountId,
			});
			toast.success('GCP account connected successfully', {
				position: 'bottom-right',
			});
			void invalidateListAccounts(queryClient, {
				cloudProvider: INTEGRATION_TYPES.GCP,
			});
			handleClose();
		},
		[handleClose, queryClient],
	);

	const connectAccount = useCallback(
		async (values: GcpSetupFormValues): Promise<void> => {
			try {
				setIsLoading(true);

				const payload: CloudintegrationtypesPostableAccountDTO = {
					config: {
						gcp: {
							deploymentRegion: values.deploymentRegion,
							deploymentProjectId: values.deploymentProjectId,
							projectIds: values.projectIds || [],
						},
					},
					credentials: {
						// Fields are always visible & pre-filled, so user-edited values win;
						// fall back to fetched credentials if the form hasn't hydrated yet.
						ingestionUrl:
							values.ingestionUrl || connectionParams?.data?.ingestionUrl || '',
						ingestionKey:
							values.ingestionKey || connectionParams?.data?.ingestionKey || '',
						sigNozApiUrl:
							values.sigNozApiUrl || connectionParams?.data?.sigNozApiUrl || '',
						sigNozApiKey:
							values.sigNozApiKey || connectionParams?.data?.sigNozApiKey || '',
					},
				};

				// Step 1: create the integration account.
				const createResponse: CreateAccountMutationResult = await createAccount({
					pathParams: { cloudProvider: INTEGRATION_TYPES.GCP },
					data: payload,
				});

				const cloudIntegrationId = createResponse.data.id;
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

				handleConnectionSuccess({ cloudIntegrationId, providerAccountId });
			} catch {
				toast.error('Failed to connect GCP account', {
					position: 'bottom-right',
				});
			} finally {
				setIsLoading(false);
			}
		},
		[connectionParams, createAccount, checkIn, handleConnectionSuccess],
	);

	return {
		isLoading,
		connectAccount,
		handleClose,
		connectionParams: connectionParams?.data as
			| CloudintegrationtypesCredentialsDTO
			| undefined,
		isConnectionParamsLoading,
	};
}
