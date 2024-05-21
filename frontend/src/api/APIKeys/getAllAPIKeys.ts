import axios from 'api';
import { AxiosResponse } from 'axios';
import { AllAPIKeyProps } from 'types/api/pat/types';

export const getAllAPIKeys = (): Promise<AxiosResponse<AllAPIKeyProps>> =>
	axios.get(`/pats`);
