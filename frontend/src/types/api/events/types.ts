export interface EventSuccessPayloadProps {
	status: string;
	data: string;
}

export interface EventRequestPayloadProps {
	eventName: string;
	attributes: Record<string, unknown>;
}
