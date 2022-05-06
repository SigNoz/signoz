import { GlobalTime } from 'types/actions/globalTime';

export interface Props {
	start: GlobalTime['minTime'];
	end: GlobalTime['maxTime'];
	serviceName: string;
	errorType: string;
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
	serviceName: Props['serviceName'];
	newerErrorId: string;
	olderErrorId: string;
}
