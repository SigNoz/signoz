import { GlobalTime } from 'types/actions/globalTime';
import { Tags } from 'hooks/useResourceAttribute/types';

export type Props = {
	start: GlobalTime['minTime'];
	end: GlobalTime['minTime'];
	exceptionType: string;
	serviceName: string;
	tags: Tags[];
};

export type PayloadProps = number;
