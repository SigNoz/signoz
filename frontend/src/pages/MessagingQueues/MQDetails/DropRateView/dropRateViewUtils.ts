export function convertToMilliseconds(timeInput: string): number {
	if (!timeInput.trim()) {
		return 0;
	}

	const match = timeInput.match(/^(\d+)(ms|s|ns)?$/); // Match number and optional unit
	if (!match) {
		throw new Error(`Invalid time format: ${timeInput}`);
	}

	const value = parseInt(match[1], 10);
	const unit = match[2] || 'ms'; // Default to 'ms' if no unit is provided

	switch (unit) {
		case 's':
			return value * 1e3;
		case 'ms':
			return value;
		case 'ns':
			return value / 1e6;
		default:
			throw new Error('Invalid time format');
	}
}

export interface DropRateResponse {
	timestamp: string;
	data: {
		breach_percentage: number;
		breached_spans: number;
		consumer_service: string;
		producer_service: string;
		top_traceIDs: string[];
		total_spans: number;
	};
}
export interface DropRateAPIResponse {
	status: string;
	data: {
		resultType: string;
		result: {
			queryName: string;
			list: DropRateResponse[];
		}[];
	};
}
