import { useQuery, UseQueryResult } from 'react-query';
import { getIntegrationStatus } from 'api/Integrations/getIntegrationStatus';
import { AxiosError, AxiosResponse } from 'axios';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import {
	GetIntegrationPayloadProps,
	GetIntegrationStatusProps,
} from 'types/api/integrations/types';

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
			integrationId !== INTEGRATION_TYPES.AWS,
	});
