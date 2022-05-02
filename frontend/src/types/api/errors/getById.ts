import { GlobalTime } from 'types/actions/globalTime';

import { PayloadProps as Payload } from './getByErrorTypeAndService';

export type PayloadProps = Payload;

export type Props = {
	start: GlobalTime['minTime'];
	end: GlobalTime['minTime'];
	errorId: string;
};
