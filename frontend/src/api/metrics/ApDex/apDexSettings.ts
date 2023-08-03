import axios from 'api';
import {
	SetApDexPayloadProps,
	SetApDexSettingsProps,
} from 'types/api/metrics/getApDex';

export const setApDexSettings = async ({
	serviceName,
	threshold,
	excludeStatusCode,
}: SetApDexSettingsProps): Promise<SetApDexPayloadProps> => {
	const response = await axios.post('/settings/apdex', {
		serviceName,
		threshold,
		excludeStatusCode,
	});

	return response.data;
};
