import { AxiosError } from 'axios';
import { useAppContext } from 'providers/App/App';
import { LicensePlatform } from 'types/api/licensesV3/getActive';

export const useGetTenantLicense = (): {
	isCloudUser: boolean;
	isEnterpriseSelfHostedUser: boolean;
	isCommunityUser: boolean;
	isCommunityEnterpriseUser: boolean;
} => {
	const { activeLicenseV3, activeLicenseV3FetchError } = useAppContext();

	const responsePayload = {
		isCloudUser: activeLicenseV3?.platform === LicensePlatform.CLOUD || false,
		isEnterpriseSelfHostedUser:
			activeLicenseV3?.platform === LicensePlatform.SELF_HOSTED || false,
		isCommunityUser: false,
		isCommunityEnterpriseUser: false,
	};

	if (
		activeLicenseV3FetchError &&
		(activeLicenseV3FetchError as AxiosError)?.response?.status === 404
	) {
		responsePayload.isCommunityEnterpriseUser = true;
	}

	if (
		activeLicenseV3FetchError &&
		(activeLicenseV3FetchError as AxiosError)?.response?.status === 501
	) {
		responsePayload.isCommunityUser = true;
	}

	return responsePayload;
};
