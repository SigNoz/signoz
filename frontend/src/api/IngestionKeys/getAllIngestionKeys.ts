import { GatewayApiV1Instance } from 'api';
import { AxiosResponse } from 'axios';
import {
	AllIngestionKeyProps,
	GetIngestionKeyProps,
} from 'types/api/ingestionKeys/types';

export const getAllIngestionKeys = (
	props: GetIngestionKeyProps,
): Promise<AxiosResponse<AllIngestionKeyProps>> => {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	const { search, per_page, page } = props;

	const BASE_URL = '/workspaces/me/keys';
	const URL_QUERY_PARAMS =
		search && search.length > 0
			? `/search?name=${search}&page=1&per_page=100`
			: `?page=${page}&per_page=${per_page}`;

	return GatewayApiV1Instance.get(`${BASE_URL}${URL_QUERY_PARAMS}`);
};
