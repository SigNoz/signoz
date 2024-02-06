import { UseTableViewProps } from 'components/Logs/TableView/types';

export type InfinityTableProps = {
	isLoading?: boolean;
	tableViewProps: Omit<UseTableViewProps, 'onOpenLogsContext' | 'onClickExpand'>;
	isTableHeaderDraggable?: boolean;
	infitiyTableProps?: {
		onEndReached: (index: number) => void;
	};
	isDashboardPanel?: boolean;
};
