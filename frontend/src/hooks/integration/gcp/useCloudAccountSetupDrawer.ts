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
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import { ErrorType } from 'api/generatedAPIInstance';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import { GcpSetupFormValues } from 'container/Integrations/CloudIntegration/GoogleCloudPlatform/AddNewAccount/types';
import useAxiosError from 'hooks/useAxiosError';
import { toAPIError } from 'utils/errorUtils';

import logEvent from '../../../api/common/logEvent';

interface UseCloudAccountSetupDrawerProps {
	onClose: () => void;
}

interface UseCloudAccountSetupDrawer {
	isLoading: boolean;
	connectAccount: (values: GcpSetupFormValues) => Promise<void>;
	handleClose: () => void;
	connectionParams?: CloudintegrationtypesCredentialsDTO;
	isConnectionParamsLoading: boolean;
	/** Backend error from the last connect attempt, shown inline in the drawer. */
	submitError: string | null;
	clearSubmitError: () => void;
}

export function useCloudAccountSetupDrawer({
	onClose,
}: UseCloudAccountSetupDrawerProps): UseCloudAccountSetupDrawer {
	const queryClient = useQueryClient();
	const [isLoading, setIsLoading] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const clearSubmitError = useCallback((): void => {
		setSubmitError(null);
	}, []);

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
				setSubmitError(null);

				const payload: CloudintegrationtypesPostableAccountDTO = {
					config: {
						gcp: {
							deploymentRegion: values.deploymentRegion,
							deploymentProjectId: values.deploymentProjectId,
							projectIds: values.projectIds || [],
						},
					},
					credentials: {
						// Cloud users can't edit these — the backend-provided credentials are
						// authoritative. Enterprise users have no backend defaults and enter
						// their own (validated non-empty), so their form values are used.
						ingestionUrl: connectionParams?.data?.ingestionUrl || values.ingestionUrl,
						ingestionKey: connectionParams?.data?.ingestionKey || values.ingestionKey,
						sigNozApiUrl: connectionParams?.data?.sigNozApiUrl || values.sigNozApiUrl,
						sigNozApiKey: connectionParams?.data?.sigNozApiKey || values.sigNozApiKey,
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
			} catch (error) {
				// Surface the backend's message inline in the drawer instead of a
				// generic failure string.
				const message = toAPIError(
					error as ErrorType<RenderErrorResponseDTO>,
					'Failed to connect GCP account',
				).getErrorMessage();
				setSubmitError(message);
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
		submitError,
		clearSubmitError,
	};
}
