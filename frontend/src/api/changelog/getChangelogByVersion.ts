import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import axios, { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	ChangelogSchema,
	DeploymentType,
} from 'types/api/changelog/getChangelogByVersion';

const getChangelogByVersion = async (
	versionId: string,
	deployment_type?: DeploymentType,
): Promise<SuccessResponse<ChangelogSchema> | ErrorResponse> => {
	try {
		let queryParams = `filters[version][$eq]=${versionId}&populate[features][sort]=sort_order:asc&populate[features][populate][media][fields]=id,ext,url,mime,alternativeText`;

		if (
			deployment_type &&
			Object.values(DeploymentType).includes(deployment_type)
		) {
			const excludedDeploymentType =
				deployment_type === DeploymentType.CLOUD_ONLY
					? DeploymentType.OSS_ONLY
					: DeploymentType.CLOUD_ONLY;

			queryParams = `${queryParams}&populate[features][filters][deployment_type][$notIn]=${excludedDeploymentType}`;
		}

		const response = await axios.get(`
			https://cms.signoz.cloud/api/release-changelogs?${queryParams}
        `);

		if (!Array.isArray(response.data.data) || response.data.data.length === 0) {
			throw new Error('No changelog found!');
		}

		return {
			statusCode: 200,
			error: null,
			message: response.statusText,
			payload: response.data.data[0],
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getChangelogByVersion;
