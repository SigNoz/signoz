import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';

export interface DayBreakdownEntry {
	timestamp: number;
	total: number;
	quantity: number;
	count: number;
	size: number;
}

export interface TierEntry {
	quantity: number;
	unitPrice: number;
	tierCost: number;
}

export interface BreakdownEntry {
	type: string;
	unit: string;
	dayWiseBreakdown: {
		breakdown: DayBreakdownEntry[];
	};
	tiers?: TierEntry[];
}

export interface UsageResponsePayloadProps {
	billingPeriodStart: number;
	billingPeriodEnd: number;
	details: {
		total: number;
		baseFee: number;
		breakdown: BreakdownEntry[];
		billTotal: number;
	};
	discount: number;
	subscriptionStatus?: string;
}

const getUsage = async (
	licenseKey: string,
): Promise<SuccessResponse<UsageResponsePayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.get(`/billing?licenseKey=${licenseKey}`);

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getUsage;
