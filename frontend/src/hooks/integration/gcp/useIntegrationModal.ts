import { useCallback, useState } from 'react';
import { useQueryClient } from 'react-query';
import { toast } from '@signozhq/ui/sonner';
import { Form, FormInstance } from 'antd';
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
import useAxiosError from 'hooks/useAxiosError';

import logEvent from '../../../api/common/logEvent';

interface UseIntegrationModalProps {
	onClose: () => void;
}

interface UseGCPIntegrationModal {
	form: FormInstance;
	isLoading: boolean;
	handleSubmit: () => Promise<void>;
	handleClose: () => void;
	connectionParams?: CloudintegrationtypesCredentialsDTO;
	isConnectionParamsLoading: boolean;
}

export function useIntegrationModal({
	onClose,
}: UseIntegrationModalProps): UseGCPIntegrationModal {
	const queryClient = useQueryClient();
	const [form] = Form.useForm();
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

	const handleSubmit = useCallback(async (): Promise<void> => {
		try {
			setIsLoading(true);
			const values = await form.validateFields();

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
					ingestionUrl: values.ingestionUrl || connectionParams?.data?.ingestionUrl,
					ingestionKey: values.ingestionKey || connectionParams?.data?.ingestionKey,
					sigNozApiUrl: values.sigNozApiUrl || connectionParams?.data?.sigNozApiUrl,
					sigNozApiKey: values.sigNozApiKey || connectionParams?.data?.sigNozApiKey,
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
			// antd's validateFields rejects with an errorFields object; only surface
			// a toast for real (network/server) failures, not validation misses.
			if (error && typeof error === 'object' && 'errorFields' in error) {
				return;
			}
			toast.error('Failed to connect GCP account', {
				position: 'bottom-right',
			});
		} finally {
			setIsLoading(false);
		}
	}, [form, connectionParams, createAccount, checkIn, handleConnectionSuccess]);

	return {
		form,
		isLoading,
		handleSubmit,
		handleClose,
		connectionParams: connectionParams?.data as
			| CloudintegrationtypesCredentialsDTO
			| undefined,
		isConnectionParamsLoading,
	};
}
