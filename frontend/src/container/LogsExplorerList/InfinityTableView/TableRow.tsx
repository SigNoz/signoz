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
} from 'react';
import { ILog } from 'types/api/logs/log';

import { TableCellStyled } from './styles';

interface TableRowProps {
	tableColumns: ColumnsType<Record<string, unknown>>;
	index: number;
	log: Record<string, unknown>;
	handleSetActiveContextLog: (log: ILog) => void;
	logs: ILog[];
	hasActions: boolean;
}

export default function TableRow({
	tableColumns,
	index,
	log,
	handleSetActiveContextLog,
	logs,
	hasActions,
}: TableRowProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const currentLog = useMemo(() => logs.find(({ id }) => id === log.id), [
		logs,
		log.id,
	]);

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

				const isBody = column.key === 'body';
				const isTimestamp = column.key === 'timestamp';

				if (isTimestamp || isBody) {
					return (
						<td
							key={column.key}
							className={`${isTimestamp ? 'log-timestamp' : 'log-body'}`}
						>
							{cloneElement(children, props)}
						</td>
					);
				}

				// Setting the width of body column to 500px to maintain the consistency and reduce layout shift due to body content change

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
				<div className="log-actions">
					<LogLinesActionButtons
						handleShowContext={handleShowContext}
						onLogCopy={onLogCopy}
						customClassName="table-view-log-actions"
					/>
				</div>
			)}
		</>
	);
}
