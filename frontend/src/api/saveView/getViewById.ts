import axios from 'api';
import { AxiosResponse } from 'axios';
import { ViewProps } from 'types/api/saveViews/types';

export interface GetViewByIdProps {
	status: string;
	data: ViewProps;
}

export const getViewById = (
	viewKey: string,
): Promise<AxiosResponse<GetViewByIdProps>> =>
	axios.get(`/explorer/views/${viewKey}`);
