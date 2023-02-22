import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

export interface Props {
	start: GlobalReducer['minTime'];
	end: GlobalReducer['maxTime'];
	tagKey: {
		Key: string;
		Type: string;
	};
	spanKind?: TraceReducer['spanKind'];
}

export interface PayloadProps {
	stringTagValues: string[];
	numberTagValues: number[];
	boolTagValues: boolean[];
}
