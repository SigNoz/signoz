import { setApDexSettings } from 'api/metrics/ApDex/apDexSettings';
import { useMutation, UseMutationResult } from 'react-query';
import {
	SetApDexPayloadProps,
	SetApDexSettingsProps,
} from 'types/api/metrics/getApDex';

export const useSetApDexSettings = ({
	servicename,
	threshold,
	excludeStatusCode,
}: SetApDexSettingsProps): UseMutationResult<
	SetApDexPayloadProps,
	Error,
	SetApDexSettingsProps
> => {
	const queryKey = [servicename, threshold.toString(), excludeStatusCode];
	return useMutation<SetApDexPayloadProps, Error, SetApDexSettingsProps>({
		mutationKey: queryKey,
		mutationFn: async () =>
			setApDexSettings({ servicename, threshold, excludeStatusCode }),
	});
};
