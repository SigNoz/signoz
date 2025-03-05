import { useAppContext } from 'providers/App/App';
import { LicensePlatform } from 'types/api/licensesV3/getActive';

export const useGetTenantLicense = (): {
	isCloudUser: boolean;
	isEECloudUser: boolean;
} => {
	const { activeLicenseV3 } = useAppContext();

	return {
		isCloudUser: activeLicenseV3?.platform === LicensePlatform.CLOUD || false,
		isEECloudUser:
			activeLicenseV3?.platform === LicensePlatform.SELF_HOSTED || false,
	};
};
