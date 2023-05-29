export interface ILog {
	timestamp: number;
	id: string;
	traceId: string;
	spanId: string;
	traceFlags: number;
	severityText: string;
	severityNumber: number;
	body: string;
	resourcesString: Record<string, never>;
	attributesString: Record<string, never>;
	attributesInt: Record<string, never>;
	attributesFloat: Record<string, never>;
	attributes_string: {
		log_file_path: string;
	};
}
