import { Props as GetDBOverViewProps } from './getDBOverview';

export type Props = GetDBOverViewProps;

export interface ExternalError {
	avgDuration: number;
	errorRate: number;
	externalHttpUrl: string;
	numErrors: number;
	timestamp: number;
}

export type PayloadProps = ExternalError[];
