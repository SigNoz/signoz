import type { UseQueryResult } from 'react-query';
import { useQuery } from 'react-query';
import { getAllIntegrations } from 'api/Integrations/getAllIntegrations';
import type { AxiosError, AxiosResponse } from 'axios';
import type { AllIntegrationsProps } from 'types/api/integrations/types';

export const useGetAllIntegrations = (): UseQueryResult<
	AxiosResponse<AllIntegrationsProps>,
	AxiosError
> =>
	useQuery<AxiosResponse<AllIntegrationsProps>, AxiosError>({
		queryKey: ['Integrations'],
		queryFn: () => getAllIntegrations(),
	});
