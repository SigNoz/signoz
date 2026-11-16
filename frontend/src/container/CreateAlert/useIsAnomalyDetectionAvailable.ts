import { useGetTenantLicense } from 'hooks/useGetTenantLicense';

export const useIsAnomalyDetectionAvailable = (): boolean => {
	const { isCloudUser, isEnterpriseSelfHostedUser } = useGetTenantLicense();
	return isCloudUser || isEnterpriseSelfHostedUser;
};
