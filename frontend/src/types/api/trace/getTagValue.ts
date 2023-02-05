import { GlobalReducer } from 'types/reducer/globalTime';

export interface Props {
	start: GlobalReducer['minTime'];
	end: GlobalReducer['maxTime'];
	tagKey: {
		Key: string;
		Type: string;
	};
}

export interface PayloadProps {
	stringTagValues: string[];
	numberTagValues: number[];
	boolTagValues: boolean[];
}
