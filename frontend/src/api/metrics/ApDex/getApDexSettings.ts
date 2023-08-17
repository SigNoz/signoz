import axios from 'api';
import { AxiosResponse } from 'axios';
import { ApDexPayloadAndSettingsProps } from 'types/api/metrics/getApDex';

export const getApDexSettings = (
	servicename: string,
): Promise<AxiosResponse<ApDexPayloadAndSettingsProps[]>> =>
	axios.get(`/settings/apdex?services=${servicename}`);
