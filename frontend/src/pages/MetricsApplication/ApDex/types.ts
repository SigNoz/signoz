import { AxiosResponse } from 'axios';
import { ApDexPayloadProps } from 'types/api/metrics/getApDex';

export interface ApDexSettingsProps {
	servicename: string;
	handlePopOverClose: () => void;
	isLoading?: boolean;
	data?: AxiosResponse<ApDexPayloadProps[]> | undefined;
	refetchGetApDexSetting?: () => void;
}
