import { QueryData } from 'types/api/widgets/getQuery';

export type LogsExplorerChartProps = {
	data: QueryData[];
	isLoading: boolean;
	isLogsExplorerViews?: boolean;
	isLabelEnabled?: boolean;
	className?: string;
};
