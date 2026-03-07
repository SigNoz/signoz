import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	AlertRuleV2,
	PostableAlertRuleV2,
} from 'types/api/alerts/alertTypesV2';

export interface CreateAlertRuleResponse {
	data: AlertRuleV2;
	status: string;
}

const createAlertRule = async (
	props: PostableAlertRuleV2,
): Promise<SuccessResponse<CreateAlertRuleResponse> | ErrorResponse> => {
	const response = await axios.post(`/rules`, {
		...props,
	});

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};

export default createAlertRule;
