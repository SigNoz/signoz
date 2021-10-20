import { Props as GetDBOverViewProps } from './getDBOverview';

export type Props = GetDBOverViewProps;

export interface ExternalAverageDuration {
	avgDuration: number;
	errorRate: number;
	numErrors: number;
	timestamp: number;
}

export type PayloadProps = ExternalAverageDuration[];
