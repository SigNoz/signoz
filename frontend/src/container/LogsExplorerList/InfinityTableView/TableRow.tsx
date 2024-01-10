import './TableRow.styles.scss';

import { ColumnsType } from 'antd/es/table';
import LogLinesActionButtons from 'components/Logs/LogLinesActionButtons/LogLinesActionButtons';
import { ColumnTypeRender } from 'components/Logs/TableView/types';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import { useIsDarkMode } from 'hooks/useDarkMode';
import {
	cloneElement,
	MouseEventHandler,
	ReactElement,
	ReactNode,
	useCallback,
	useMemo,
	useState,
} from 'react';
import { ILog } from 'types/api/logs/log';

import { TableCellStyled } from './styles';

interface TableRowProps {
	tableColumns: ColumnsType<Record<string, unknown>>;
	index: number;
	log: Record<string, unknown>;
	handleSetActiveContextLog: (log: ILog) => void;
	logs: ILog[];
	onSetActiveLog: (log: ILog) => void;
}

export default function TableRow({
	tableColumns,
	index,
	log,
	handleSetActiveContextLog,
	logs,
	onSetActiveLog,
}: TableRowProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const [hasActions, setHasActions] = useState<boolean>(false);

	const currentLog = useMemo(() => logs.find(({ id }) => id === log.id), [
		logs,
		log.id,
	]);

	const handleClickExpand = (): void => {
		if (!onSetActiveLog) return;

		onSetActiveLog(logs[index]);
	};

	const { onLogCopy, isLogsExplorerPage } = useCopyLogLink(currentLog?.id);

	const handleShowContext: MouseEventHandler<HTMLElement> = useCallback(
		(event) => {
			event.preventDefault();
			event.stopPropagation();
			if (!handleSetActiveContextLog || !currentLog) return;

			handleSetActiveContextLog(currentLog);
		},
		[currentLog, handleSetActiveContextLog],
	);

	const handleShowActions = (): void => {
		setHasActions(true);
	};

	const handleHideActions = (): void => {
		setHasActions(false);
	};

	return (
		<div
			onClick={handleClickExpand}
			className="logs-table-row"
			onMouseEnter={handleShowActions}
			onMouseLeave={handleHideActions}
		>
			{tableColumns.map((column) => {
				if (!column.render) return <td>Empty</td>;

				const element: ColumnTypeRender<Record<string, unknown>> = column.render(
					log[column.key as keyof Record<string, unknown>],
					log,
					index,
				);

				const elementWithChildren = element as Exclude<
					ColumnTypeRender<Record<string, unknown>>,
					ReactNode
				>;

				const children = elementWithChildren.children as ReactElement;
				const props = elementWithChildren.props as Record<string, unknown>;

				return (
					<TableCellStyled
						$isDragColumn={false}
						$isDarkMode={isDarkMode}
						key={column.key}
					>
						{cloneElement(children, props)}
					</TableCellStyled>
				);
			})}
			{hasActions && isLogsExplorerPage && (
				<LogLinesActionButtons
					handleShowContext={handleShowContext}
					onLogCopy={onLogCopy}
					customClassName="table-view-log-actions"
				/>
			)}
		</div>
	);
}
