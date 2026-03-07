import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps } from 'types/api/preferences/list';
import { OrgPreference } from 'types/api/preferences/preference';

const listPreference = async (): Promise<
	SuccessResponseV2<OrgPreference[]>
> => {
	try {
		const response = await axios.get<PayloadProps>(`/org/preferences`);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default listPreference;
