import { SuccessResponseV2 } from 'types/api';
import { ApDexPayloadAndSettingsProps } from 'types/api/metrics/getApDex';

export interface ApDexSettingsProps {
	servicename: string;
	handlePopOverClose: () => void;
	isLoading?: boolean;
	data?: SuccessResponseV2<ApDexPayloadAndSettingsProps[]>;
	refetchGetApDexSetting?: () => void;
}
