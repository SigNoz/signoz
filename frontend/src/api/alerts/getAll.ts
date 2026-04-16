import { listRules } from 'api/generated/services/rules';
import { SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/alerts/getAll';

const getAll = async (): Promise<SuccessResponse<PayloadProps>> => {
	const response = await listRules();
	return {
		statusCode: 200,
		error: null,
		message: response.status,
		payload: ((response.data?.rules ?? []) as unknown) as PayloadProps,
	};
};

export default getAll;
