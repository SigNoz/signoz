import { PayloadProps as ConfigPayload } from 'types/api/dynamicConfigs/getDynamicConfigs';

export default interface AppReducer {
	currentVersion: string;
	latestVersion: string;
	isCurrentVersionError: boolean;
	isLatestVersionError: boolean;
	configs: ConfigPayload;
	ee: 'Y' | 'N';
	setupCompleted: boolean;
}
