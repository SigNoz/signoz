import { GatewayApiV1Instance } from 'api';
import { AxiosResponse } from 'axios';
import {
	AllIngestionKeyProps,
	GetIngestionKeyProps,
} from 'types/api/ingestionKeys/types';

export const getAllIngestionKeys = (
	props: GetIngestionKeyProps,
): Promise<AxiosResponse<AllIngestionKeyProps>> =>
	GatewayApiV1Instance.get(
		`/workspaces/me/keys?page=${props.page}&per_page=${props.per_page}`,
	);
