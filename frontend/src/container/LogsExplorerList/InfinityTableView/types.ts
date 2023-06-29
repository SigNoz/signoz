import { LogsTableViewProps } from 'components/Logs/TableView/types';

export type InfinityTableProps = {
	tableViewProps: LogsTableViewProps;
	infitiyTableProps: {
		onEndReached: (index: number) => void;
	};
};
