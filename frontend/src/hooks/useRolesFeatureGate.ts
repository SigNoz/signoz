import { FeatureKeys } from 'constants/features';
import { useAppContext } from 'providers/App/App';
import { LicenseStatus } from 'types/api/licensesV3/getActive';

export const useRolesFeatureGate = (): { isRolesEnabled: boolean } => {
	const { activeLicense, featureFlags } = useAppContext();

	const isValidLicense = activeLicense?.status === LicenseStatus.VALID;
	const isFineGrainedAuthzEnabled =
		featureFlags?.find((f) => f.name === FeatureKeys.USE_FINE_GRAINED_AUTHZ)
			?.active ?? false;

	return { isRolesEnabled: isValidLicense && isFineGrainedAuthzEnabled };
};
