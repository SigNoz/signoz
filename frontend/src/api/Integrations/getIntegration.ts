import axios from 'api';
import { AxiosResponse } from 'axios';
import {
	GetIntegrationPayloadProps,
	GetIntegrationProps,
} from 'types/api/integrations/types';

export const getIntegration = (
	props: GetIntegrationPayloadProps,
): Promise<AxiosResponse<GetIntegrationProps>> =>
	axios.get(`/integrations/${props.integrationId}`);
