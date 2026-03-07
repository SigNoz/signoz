import { StatusCodes } from 'http-status-codes';
import { SuccessResponseV2 } from 'types/api';
import { ApDexPayloadAndSettingsProps } from 'types/api/metrics/getApDex';

export const axiosResponseThresholdData = {
	data: [
		{
			threshold: 0.5,
		},
	],
	httpStatusCode: StatusCodes.OK,
} as SuccessResponseV2<ApDexPayloadAndSettingsProps[]>;
