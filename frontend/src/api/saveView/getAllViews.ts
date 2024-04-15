import axios from 'api';
import { AxiosResponse } from 'axios';
import { AllViewsProps } from 'types/api/saveViews/types';
import { DataSource } from 'types/common/queryBuilder';

export const getAllViews = (
	sourcepage: DataSource,
): Promise<AxiosResponse<AllViewsProps>> =>
	axios.get(`/explorer/views?sourcePage=${sourcepage}`);
