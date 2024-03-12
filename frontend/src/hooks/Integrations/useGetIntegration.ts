import { getIntegration } from 'api/Integrations/getIntegration';
import { AxiosError, AxiosResponse } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
import {
	GetIntegrationPayloadProps,
	GetIntegrationProps,
} from 'types/api/integrations/types';

export const useGetIntegration = ({
	integrationId,
}: GetIntegrationPayloadProps): UseQueryResult<
	AxiosResponse<GetIntegrationProps>,
	AxiosError
> =>
	useQuery<AxiosResponse<GetIntegrationProps>, AxiosError>({
		queryKey: ['Integration', integrationId],
		queryFn: () => getIntegration({ integrationId }),
	});
