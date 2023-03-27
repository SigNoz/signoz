import { IResourceAttribute } from 'hooks/useResourceAttribute/types';
import { GlobalTime } from 'types/actions/globalTime';

export type Props = {
	start: GlobalTime['minTime'];
	end: GlobalTime['minTime'];
	exceptionType: string;
	serviceName: string;
	tags: IResourceAttribute[];
};

export type PayloadProps = number;
