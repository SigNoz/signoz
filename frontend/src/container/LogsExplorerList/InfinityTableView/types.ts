import { UseTableViewProps } from 'components/Logs/TableView/types';

export type InfinityTableProps = {
	tableViewProps: UseTableViewProps;
	infitiyTableProps: {
		onEndReached: (index: number) => void;
	};
};
