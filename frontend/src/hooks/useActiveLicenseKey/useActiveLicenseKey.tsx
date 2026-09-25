import { useMemo } from 'react';
import { useGetLicense } from 'api/generated/services/licenses';
import { buildLicenseReadPermission } from 'lib/authz/hooks/useAuthZ/permissions/license.permissions';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { useAppContext } from 'providers/App/App';

interface UseActiveLicenseKey {
	licenseKey: string | undefined;
	isLoading: boolean;
}

const useActiveLicenseKey = (): UseActiveLicenseKey => {
	const { activeLicense } = useAppContext();

	const permissions = useMemo(
		() => (activeLicense ? [buildLicenseReadPermission(activeLicense.id)] : []),
		[activeLicense],
	);
	const { allowed, isLoading: isAuthZLoading } = useAuthZ(permissions, {
		enabled: !!activeLicense,
	});

	const { data, isLoading: isLicenseLoading } = useGetLicense(
		{ id: activeLicense?.id ?? '' },
		{ query: { enabled: !!activeLicense && allowed } },
	);

	return {
		licenseKey: data?.data.key,
		isLoading:
			!!activeLicense && (isAuthZLoading || (allowed && isLicenseLoading)),
	};
};

export default useActiveLicenseKey;
