import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { Props } from 'types/api/preferences/update';

/**
 * @deprecated Use the generated `useUpdateUserPreference` hook (or `updateUserPreference` fetcher) from
 * `api/generated/services/preferences` instead. This hand-written client targets the
 * same endpoint and will be removed once call sites migrate.
 *
 * Part of https://github.com/SigNoz/engineering-pod/issues/5289, add a comment or update when removing this method.
 */
const update = async (props: Props): Promise<SuccessResponseV2<null>> => {
	try {
		const response = await axios.put(`/user/preferences/${props.name}`, {
			value: props.value,
		});

		return {
			httpStatusCode: response.status,
			data: null,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default update;
