import { GlobalReducer } from 'types/reducer/globalTime';

export interface Props {
	start: GlobalReducer['minTime'];
	end: GlobalReducer['maxTime'];
	tagKey: string;
}

interface Value {
	tagValues: string;
}

export type PayloadProps = Value[];
