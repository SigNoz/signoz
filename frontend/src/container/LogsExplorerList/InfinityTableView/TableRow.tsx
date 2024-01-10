import './TableRow.styles.scss';

import { ColumnsType } from 'antd/es/table';
import LogLinesActionButtons from 'components/Logs/LogLinesActionButtons/LogLinesActionButtons';
import { ColumnTypeRender } from 'components/Logs/TableView/types';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import { useIsDarkMode } from 'hooks/useDarkMode';
import {
	cloneElement,
	ReactElement,
	ReactNode,
	useCallback,
	useMemo,
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

	const currentLog = useMemo(() => logs.find(({ id }) => id === log.id), [
		logs,
		log.id,
	]);

	// const handleClickExpand = useCallback(
	// 	(log: ILog): void => {
	// 		if (!onSetActiveLog) return;

	// 		onSetActiveLog(log);
	// 	},
	// 	[onSetActiveLog],
	// );

	const { onLogCopy, isLogsExplorerPage } = useCopyLogLink(currentLog?.id);

	const handleShowContext = useCallback(() => {
		if (!handleSetActiveContextLog || !currentLog) return;

		handleSetActiveContextLog(currentLog);
	}, [currentLog, handleSetActiveContextLog]);

	return (
		<>
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
			<td>
				{isLogsExplorerPage && (
					<LogLinesActionButtons
						handleShowContext={handleShowContext}
						onLogCopy={onLogCopy}
						customClassName="table-view-log-actions"
					/>
				)}
			</td>
		</>
	);
}
