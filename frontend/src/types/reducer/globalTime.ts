import type {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import type { GlobalTime } from 'types/actions/globalTime';

export interface GlobalReducer {
	maxTime: GlobalTime['maxTime'];
	minTime: GlobalTime['minTime'];
	loading: boolean;
	selectedTime: Time | CustomTimeType;
	isAutoRefreshDisabled: boolean;
	selectedAutoRefreshInterval: string;
}
