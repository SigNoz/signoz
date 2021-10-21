import { Props as GetDBOverViewProps } from './getDBOverview';

export type Props = GetDBOverViewProps;

export interface ExternalService {
	avgDuration: number;
	callRate: number;
	errorRate: number;
	externalHttpUrl: string;
	numCalls: number;
	numErrors: number;
	timestamp: number;
}

export type PayloadProps = ExternalService[];
