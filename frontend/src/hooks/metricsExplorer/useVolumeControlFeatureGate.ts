import { FeatureKeys } from 'constants/features';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { useAppContext } from 'providers/App/App';
import { USER_ROLES } from 'types/roles';

interface VolumeControlFeatureGate {
	isVolumeControlEnabled: boolean;
	canManageVolumeControl: boolean;
	isLoading: boolean;
}

export function useVolumeControlFeatureGate(): VolumeControlFeatureGate {
	const { isCloudUser, isEnterpriseSelfHostedUser } = useGetTenantLicense();
	const { user, featureFlags, isFetchingActiveLicense, activeLicense } =
		useAppContext();

	const isMetricsReductionEnabled = Boolean(
		featureFlags?.find(
			(flag) => flag.name === FeatureKeys.ENABLE_METRICS_REDUCTION,
		)?.active,
	);

	const isVolumeControlEnabled =
		isMetricsReductionEnabled && (isCloudUser || isEnterpriseSelfHostedUser);
	const isAdmin = user?.role === USER_ROLES.ADMIN;

	return {
		isVolumeControlEnabled,
		canManageVolumeControl: isVolumeControlEnabled && isAdmin,
		isLoading: isFetchingActiveLicense && !activeLicense,
	};
}
