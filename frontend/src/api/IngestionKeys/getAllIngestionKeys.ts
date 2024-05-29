import { GatewayApiV1Instance } from 'api';
import { AxiosResponse } from 'axios';
import { AllIngestionKeyProps } from 'types/api/ingestionKeys/types';

export const getAllIngestionKeys = (): Promise<
	AxiosResponse<AllIngestionKeyProps>
> => GatewayApiV1Instance.get(`/workspaces/me/keys`);
