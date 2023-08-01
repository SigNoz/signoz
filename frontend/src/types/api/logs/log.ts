export interface ILog {
	date: string;
	timestamp: number | string;
	id: string;
	traceId: string;
	spanId: string;
	traceFlags: number;
	severityText: string;
	severityNumber: number;
	body: string;
	resources_string: Record<string, never>;
	attributesString: Record<string, never>;
	attributesInt: Record<string, never>;
	attributesFloat: Record<string, never>;
}
