import type { UseMutationResult } from 'react-query';
import { useMutation } from 'react-query';
import { setApDexSettings } from 'api/metrics/ApDex/apDexSettings';
import type {
	ApDexPayloadAndSettingsProps,
	SetApDexPayloadProps,
} from 'types/api/metrics/getApDex';

export const useSetApDexSettings = ({
	servicename,
	threshold,
	excludeStatusCode,
}: ApDexPayloadAndSettingsProps): UseMutationResult<
	SetApDexPayloadProps,
	Error,
	ApDexPayloadAndSettingsProps
> =>
	useMutation<SetApDexPayloadProps, Error, ApDexPayloadAndSettingsProps>({
		mutationKey: [servicename, threshold.toString(), excludeStatusCode],
		mutationFn: async () =>
			setApDexSettings({ servicename, threshold, excludeStatusCode }),
	});
