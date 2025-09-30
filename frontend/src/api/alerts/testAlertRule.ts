import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PostableAlertRuleV2 } from 'types/api/alerts/alertTypesV2';

export interface TestAlertRuleResponse {
	data: {
		alertCount: number;
		message: string;
	};
	status: string;
}

const testAlertRule = async (
	props: PostableAlertRuleV2,
): Promise<SuccessResponse<TestAlertRuleResponse> | ErrorResponse> => {
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
