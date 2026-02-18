import { VIEW_TYPES } from 'components/LogDetail/constants';
import { UseTableViewProps } from 'components/Logs/TableView/types';
import { ChangeViewFunctionType } from 'container/ExplorerOptions/types';
import { ILog } from 'types/api/logs/log';

export type InfinityTableProps = {
	isLoading?: boolean;
	tableViewProps: Omit<UseTableViewProps, 'onOpenLogsContext' | 'onClickExpand'>;
	infitiyTableProps?: {
		onEndReached: (index: number) => void;
	};
	handleChangeSelectedView?: ChangeViewFunctionType;
	logs?: ILog[];
	onSetActiveLog?: (
		log: ILog,
		selectedTab?: typeof VIEW_TYPES[keyof typeof VIEW_TYPES],
	) => void;
	onClearActiveLog?: () => void;
	activeLog?: ILog | null;
};
