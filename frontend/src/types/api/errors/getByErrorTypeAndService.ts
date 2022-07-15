export interface Props {
	timestamp: string;
	groupID: string;
}

export interface PayloadProps {
	errorId: string;
	exceptionType: string;
	exceptionStacktrace: string;
	exceptionEscaped: string;
	exceptionMessage: string;
	timestamp: string;
	spanID: string;
	traceID: string;
	serviceName: string;
	groupID: string;
}
