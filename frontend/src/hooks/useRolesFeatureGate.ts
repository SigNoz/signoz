import { useAppContext } from 'providers/App/App';
import { LicenseStatus } from 'types/api/licensesV3/getActive';

export const useRolesFeatureGate = (): {
	isRolesEnabled: boolean;
	isLoading: boolean;
} => {
	const { activeLicense, isFetchingActiveLicense } = useAppContext();

	const isValidLicense = activeLicense?.status === LicenseStatus.VALID;

	return {
		isRolesEnabled: isValidLicense,
		isLoading: isFetchingActiveLicense && !activeLicense,
	};
};
