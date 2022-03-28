import { GlobalReducer } from 'types/reducer/globalTime';

export interface Props {
	start: GlobalReducer['minTime'];
	end: GlobalReducer['maxTime'];
	tagKey: string;
}

export interface PayloadProps {
	key: string;
}
