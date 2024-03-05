import { getIntegrationStatus } from 'api/Integrations/getIntegrationStatus';
import { AxiosError, AxiosResponse } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
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
		queryKey: ['Integration', integrationId, Date.now()],
		queryFn: () => getIntegrationStatus({ integrationId }),
	});
