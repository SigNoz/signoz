import { ApiV2Instance as axios } from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, RawSuccessResponse, SuccessResponseV2 } from 'types/api';
import { Props, SessionsContext } from 'types/api/v2/sessions/context/get';

/**
 * @deprecated Use the generated `useGetSessionContext` hook (or `getSessionContext` fetcher) from
 * `api/generated/services/sessions` instead. This hand-written client targets the
 * same endpoint and will be removed once call sites migrate.
 *
 * Part of https://github.com/SigNoz/engineering-pod/issues/5289, add a comment or update when removing this method.
 */
const get = async (
	props: Props,
): Promise<SuccessResponseV2<SessionsContext>> => {
	try {
		const response = await axios.get<RawSuccessResponse<SessionsContext>>(
			'/sessions/context',
			{
				params: props,
			},
		);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default get;
