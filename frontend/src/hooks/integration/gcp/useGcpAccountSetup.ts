import { useCallback, useState } from 'react';
import { useQueryClient } from 'react-query';
import { toast } from '@signozhq/ui/sonner';
import {
	GetConnectionCredentialsQueryResult,
	invalidateListAccounts,
	useCreateAccount,
	useGetConnectionCredentials,
} from 'api/generated/services/cloudintegration';
import {
	CloudintegrationtypesCredentialsDTO,
	CloudintegrationtypesGCPPostableAccountConfigDTO,
	CloudintegrationtypesGettableAccountWithConnectionArtifactDTO,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import { ErrorType } from 'api/generatedAPIInstance';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import { GcpSetupFormValues } from 'container/Integrations/CloudIntegration/GoogleCloudPlatform/AddNewAccount/types';
import useAxiosError from 'hooks/useAxiosError';
import { toAPIError } from 'utils/errorUtils';

import logEvent from '../../../api/common/logEvent';

interface UseGcpAccountSetupProps {
	onClose: () => void;
}

interface UseGcpAccountSetup {
	connectionParams?: CloudintegrationtypesCredentialsDTO;
	isConnectionParamsLoading: boolean;
	isLoading: boolean;
	submitError: string | null;
	setSubmitError: (message: string | null) => void;
	clearSubmitError: () => void;
	createGcpAccount: (
		gcpConfig: CloudintegrationtypesGCPPostableAccountConfigDTO,
		values: GcpSetupFormValues,
	) => Promise<CloudintegrationtypesGettableAccountWithConnectionArtifactDTO>;
	/** Runs a submit, showing the backend's message inline (or `fallbackMessage`) when it fails. */
	runSubmit: (
		work: () => Promise<void>,
		fallbackMessage: string,
	) => Promise<void>;
	handleConnected: (payload: {
		cloudIntegrationId: string;
		providerAccountId: string | null;
	}) => void;
}

/** What both GCP connection methods share: credentials, account creation, submit state and the connected toast. */
export function useGcpAccountSetup({
	onClose,
}: UseGcpAccountSetupProps): UseGcpAccountSetup {
	const queryClient = useQueryClient();
	const [isLoading, setIsLoading] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const clearSubmitError = useCallback((): void => {
		setSubmitError(null);
	}, []);

	const { mutateAsync: createAccount } = useCreateAccount();
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

	const createGcpAccount = useCallback(
		async (
			gcpConfig: CloudintegrationtypesGCPPostableAccountConfigDTO,
			values: GcpSetupFormValues,
		): Promise<CloudintegrationtypesGettableAccountWithConnectionArtifactDTO> => {
			const response = await createAccount({
				pathParams: { cloudProvider: INTEGRATION_TYPES.GCP },
				data: {
					config: { gcp: gcpConfig },
					credentials: {
						// Cloud users can't edit these — the backend-provided credentials are
						// authoritative. Enterprise users have no backend defaults and enter
						// their own (validated non-empty), so their form values are used.
						ingestionUrl: connectionParams?.data?.ingestionUrl || values.ingestionUrl,
						ingestionKey: connectionParams?.data?.ingestionKey || values.ingestionKey,
						sigNozApiUrl: connectionParams?.data?.sigNozApiUrl || values.sigNozApiUrl,
						sigNozApiKey: connectionParams?.data?.sigNozApiKey || values.sigNozApiKey,
					},
				},
			});

			return response.data;
		},
		[connectionParams, createAccount],
	);

	const runSubmit = useCallback(
		async (work: () => Promise<void>, fallbackMessage: string): Promise<void> => {
			try {
				setIsLoading(true);
				setSubmitError(null);
				await work();
			} catch (error) {
				// Surface the backend's message inline in the drawer instead of a
				// generic failure string.
				const message = toAPIError(
					error as ErrorType<RenderErrorResponseDTO>,
					fallbackMessage,
				).getErrorMessage();
				setSubmitError(message);
			} finally {
				setIsLoading(false);
			}
		},
		[],
	);

	const handleConnected = useCallback(
		({
			cloudIntegrationId,
			providerAccountId,
		}: {
			cloudIntegrationId: string;
			providerAccountId: string | null;
		}): void => {
			void logEvent('GCP Integration: Account connected', {
				cloudIntegrationId,
				providerAccountId,
			});
			toast.success('GCP account connected successfully', {
				position: 'bottom-right',
			});
			void invalidateListAccounts(queryClient, {
				cloudProvider: INTEGRATION_TYPES.GCP,
			});
			onClose();
		},
		[onClose, queryClient],
	);

	return {
		connectionParams: connectionParams?.data as
			| CloudintegrationtypesCredentialsDTO
			| undefined,
		isConnectionParamsLoading,
		isLoading,
		submitError,
		setSubmitError,
		clearSubmitError,
		createGcpAccount,
		runSubmit,
		handleConnected,
	};
}
