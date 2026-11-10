import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps } from 'types/api/preferences/list';
import { UserPreference } from 'types/api/preferences/preference';

/**
 * @deprecated Use the generated `useListUserPreferences` hook (or `listUserPreferences` fetcher) from
 * `api/generated/services/preferences` instead. This hand-written client targets the
 * same endpoint and will be removed once call sites migrate.
 *
 * Part of https://github.com/SigNoz/engineering-pod/issues/5289, add a comment or update when removing this method.
 */
const list = async (): Promise<SuccessResponseV2<UserPreference[]>> => {
	try {
		const response = await axios.get<PayloadProps>(`/user/preferences`);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default list;
