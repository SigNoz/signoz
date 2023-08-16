import axios from 'api';
import { AxiosResponse } from 'axios';
import { AllViewsProps } from 'types/api/saveViews/types';

export const getAllViews = (
	sourcepage: string,
): Promise<AxiosResponse<AllViewsProps>> =>
	axios.get(`explorer/views?sourcePage=${sourcepage}`);
