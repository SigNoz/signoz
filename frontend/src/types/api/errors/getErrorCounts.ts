import type { GlobalTime } from 'types/actions/globalTime';
import type { Tags } from 'hooks/useResourceAttribute/types';

export type Props = {
	start: GlobalTime['minTime'];
	end: GlobalTime['minTime'];
	exceptionType: string;
	serviceName: string;
	tags: Tags[];
};

export type PayloadProps = number;
