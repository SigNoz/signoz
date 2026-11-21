import type { UseQueryResult } from 'react-query';
import { useQuery } from 'react-query';
import { getIntegrationStatus } from 'api/Integrations/getIntegrationStatus';
import type { AxiosError, AxiosResponse } from 'axios';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import type {
	GetIntegrationPayloadProps,
	GetIntegrationStatusProps,
} from 'types/api/integrations/types';

export function isOneClickIntegration(integrationId: string): boolean {
	return (
		integrationId === INTEGRATION_TYPES.AWS ||
		integrationId === INTEGRATION_TYPES.AZURE ||
		integrationId === INTEGRATION_TYPES.GCP
	);
}

export const useGetIntegrationStatus = ({
	integrationId,
}: GetIntegrationPayloadProps): UseQueryResult<
	AxiosResponse<GetIntegrationStatusProps>,
	AxiosError
> =>
	useQuery<AxiosResponse<GetIntegrationStatusProps>, AxiosError>({
		queryKey: ['integration-connection-status', integrationId],
		queryFn: () => getIntegrationStatus({ integrationId }),
		refetchInterval: 5000,
		enabled:
			!!integrationId &&
			integrationId !== '' &&
			!isOneClickIntegration(integrationId),
	});
