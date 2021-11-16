import { Time } from 'container/Header/DateTimeSelection/config';
import { GlobalTime } from 'types/actions/globalTime';

export interface GlobalReducer {
	maxTime: GlobalTime['maxTime'];
	minTime: GlobalTime['minTime'];
	loading: boolean;
	selectedTime: Time;
}
