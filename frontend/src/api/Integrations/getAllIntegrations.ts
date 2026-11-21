import axios from 'api';
import type { AxiosResponse } from 'axios';
import type { AllIntegrationsProps } from 'types/api/integrations/types';

export const getAllIntegrations = (): Promise<
	AxiosResponse<AllIntegrationsProps>
> => axios.get(`/integrations`);
