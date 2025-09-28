import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';

import {
	CreateAlertRuleProps,
	CreateAlertRuleResponse,
} from './createAlertRule';

const testAlertRule = async (
	props: CreateAlertRuleProps,
): Promise<SuccessResponse<CreateAlertRuleResponse> | ErrorResponse> => {
	const response = await axios.post(`/testRule`, {
		...props,
	});

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};

export default testAlertRule;
