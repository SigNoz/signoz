import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import axios, { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { ChangelogSchema } from 'types/api/changelog/getChangelogByVersion';

const getChangelogByVersion = async (
	versionId: string,
): Promise<SuccessResponse<ChangelogSchema> | ErrorResponse> => {
	try {
		const response = await axios.get(`
			https://cms.signoz.cloud/api/release-changelogs?filters[version][$eq]=${versionId}&populate[features][sort]=sort_order:asc&populate[features][populate][media][fields]=id,ext,url,mime,alternativeText
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
