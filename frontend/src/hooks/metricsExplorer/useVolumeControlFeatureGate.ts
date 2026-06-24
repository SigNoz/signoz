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
	const { user, isFetchingActiveLicense, activeLicense } = useAppContext();

	const isVolumeControlEnabled =
		isCloudUser || isEnterpriseSelfHostedUser || true;
	const isAdmin = user?.role === USER_ROLES.ADMIN || true;

	return {
		isVolumeControlEnabled,
		canManageVolumeControl: isVolumeControlEnabled && isAdmin,
		isLoading: isFetchingActiveLicense && !activeLicense,
	};
}
