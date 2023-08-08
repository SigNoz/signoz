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
> =>
	useMutation<SetApDexPayloadProps, Error, SetApDexSettingsProps>({
		mutationKey: [servicename, threshold.toString(), excludeStatusCode],
		mutationFn: async () =>
			setApDexSettings({ servicename, threshold, excludeStatusCode }),
	});
