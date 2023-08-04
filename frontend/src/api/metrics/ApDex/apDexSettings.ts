import axios from 'api';
import {
	SetApDexPayloadProps,
	SetApDexSettingsProps,
} from 'types/api/metrics/getApDex';

export const setApDexSettings = async ({
	servicename,
	threshold,
	excludeStatusCode,
}: SetApDexSettingsProps): Promise<SetApDexPayloadProps> =>
	axios.post('/settings/apdex', {
		servicename,
		threshold,
		excludeStatusCode,
	});
