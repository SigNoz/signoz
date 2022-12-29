import { GlobalTime } from 'types/actions/globalTime';

export type Props = {
	start: GlobalTime['minTime'];
	end: GlobalTime['minTime'];
	exceptionType: string;
	serviceName: string;
};

export type PayloadProps = number;
