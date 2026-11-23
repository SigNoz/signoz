import axios from 'api';
import type { AxiosResponse } from 'axios';
import type {
	GetIntegrationPayloadProps,
	GetIntegrationProps,
} from 'types/api/integrations/types';

export const getIntegration = (
	props: GetIntegrationPayloadProps,
): Promise<AxiosResponse<GetIntegrationProps>> =>
	axios.get(`/integrations/${props.integrationId}`);
