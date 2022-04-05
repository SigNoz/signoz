import { GlobalTime } from 'types/actions/globalTime';

export interface Props {
	start: GlobalTime['minTime'];
	end: GlobalTime['maxTime'];
}

interface Exception {
	exceptionType: string;
	exceptionMessage: string;
	exceptionCount: number;
	lastSeen: string;
	firstSeen: string;
	serviceName: string;
}

export type PayloadProps = Exception[];
