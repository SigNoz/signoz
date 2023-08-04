import axios from 'api';
import { AxiosResponse } from 'axios';
import { ApDexPayloadProps } from 'types/api/metrics/getApDex';

export const getApDexSettings = (
	servicename: string,
): Promise<AxiosResponse<ApDexPayloadProps[]>> =>
	axios.get(`settings/apdex?services=${servicename}`);
