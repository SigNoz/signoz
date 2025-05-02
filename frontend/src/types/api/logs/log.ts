export interface ILog {
	date: string;
	timestamp: number | string;
	id: string;
	traceId: string;
	spanID: string;
	traceFlags: number;
	severityText: string;
	severityNumber: number;
	body: string;
	resources_string: Record<string, never>;
	scope_string: Record<string, never>;
	attributesString: Record<string, never>;
	attributes_string: Record<string, never>;
	attributesInt: Record<string, never>;
	attributesFloat: Record<string, never>;
	severity_text: string;
	severity_number: number;
}

type OmitAttributesResources = Pick<
	ILog,
	Exclude<
		keyof ILog,
		| 'resources_string'
		| 'scope_string'
		| 'attributesString'
		| 'attributes_string'
		| 'attributesInt'
		| 'attributesFloat'
	>
>;

export type ILogAggregateAttributesResources = OmitAttributesResources & {
	attributes: Record<string, never>;
	resources: Record<string, never>;
	scope: Record<string, never>;
};
