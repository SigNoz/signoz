import { useAppContext } from 'providers/App/App';
import { LicensePlatform } from 'types/api/licensesV3/getActive';

export const useGetTenantLicense = (): {
	isCloudUser: boolean;
	isEnterpriseSelfHostedUser: boolean;
	isCommunityUser: boolean;
	isCommunityEnterpriseUser: boolean;
} => {
	const { activeLicense, activeLicenseFetchError } = useAppContext();

	const responsePayload = {
		isCloudUser: activeLicense?.platform === LicensePlatform.CLOUD || false,
		isEnterpriseSelfHostedUser:
			activeLicense?.platform === LicensePlatform.SELF_HOSTED || false,
		isCommunityUser: false,
		isCommunityEnterpriseUser: false,
	};

	if (
		activeLicenseFetchError &&
		activeLicenseFetchError.getHttpStatusCode() === 404
	) {
		responsePayload.isCommunityEnterpriseUser = true;
	}

	if (
		activeLicenseFetchError &&
		activeLicenseFetchError.getHttpStatusCode() === 501
	) {
		responsePayload.isCommunityUser = true;
	}

	return responsePayload;
};
