import { Time } from 'container/TopNav/DateTimeSelection/config';
import { GlobalTime } from 'types/actions/globalTime';

export interface GlobalReducer {
	maxTime: GlobalTime['maxTime'];
	minTime: GlobalTime['minTime'];
	loading: boolean;
	selectedTime: Time;
	isAutoRefreshDisabled: boolean;
	selectedAutoRefreshInterval: string;
}
