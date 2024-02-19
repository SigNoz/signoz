import { UseTableViewProps } from 'components/Logs/TableView/types';

export type InfinityTableProps = {
	isLoading?: boolean;
	tableViewProps: Omit<UseTableViewProps, 'onOpenLogsContext' | 'onClickExpand'>;
	infitiyTableProps?: {
		onEndReached: (index: number) => void;
	};
};
