import { setApDexSettings } from 'api/metrics/ApDex/apDexSettings';
import { useMutation, UseMutationResult } from 'react-query';
import {
	SetApDexPayloadProps,
	SetApDexSettingsProps,
} from 'types/api/metrics/getApDex';

export const useSetApDexSettings = ({
	serviceName,
	threshold,
	excludeStatusCode,
}: SetApDexSettingsProps): UseMutationResult<
	SetApDexPayloadProps,
	Error,
	SetApDexSettingsProps
> => {
	const queryKey = [serviceName, threshold, excludeStatusCode];
	return useMutation<SetApDexPayloadProps, Error, SetApDexSettingsProps>({
		mutationKey: queryKey,
		mutationFn: async () =>
			setApDexSettings({ serviceName, threshold, excludeStatusCode }),
	});
};
