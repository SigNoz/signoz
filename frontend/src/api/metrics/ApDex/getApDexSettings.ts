import axios from 'api';
import { ApDexPayloadProps } from 'types/api/metrics/getApDex';

export const getApDexSettings = async (
	servicename: string,
): Promise<ApDexPayloadProps> => {
	const response = await axios.get(`settings/apdex?services=${servicename}`);
	return response.data[0];
};
