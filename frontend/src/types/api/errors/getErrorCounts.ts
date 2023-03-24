import { GlobalTime } from 'types/actions/globalTime';

export type Props = {
	start: GlobalTime['minTime'];
	end: GlobalTime['minTime'];
	exceptionType: string;
	serviceName: string;
	tags: string;
};

export type PayloadProps = number;
