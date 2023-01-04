import { GlobalTime } from 'types/actions/globalTime';

export type Props = {
	start: GlobalTime['minTime'];
	end: GlobalTime['minTime'];
};

export type PayloadProps = number;
