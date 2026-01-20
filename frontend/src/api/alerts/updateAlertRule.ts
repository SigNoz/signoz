import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PostableAlertRuleV2 } from 'types/api/alerts/alertTypesV2';

export interface UpdateAlertRuleResponse {
	data: string;
	status: string;
}

const updateAlertRule = async (
	id: string,
	postableAlertRule: PostableAlertRuleV2,
): Promise<SuccessResponse<UpdateAlertRuleResponse> | ErrorResponse> => {
	const response = await axios.put(`/rules/${id}`, {
		...postableAlertRule,
	});

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};

export default updateAlertRule;
