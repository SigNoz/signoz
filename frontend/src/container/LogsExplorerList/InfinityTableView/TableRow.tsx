import './TableRow.styles.scss';

import { ColumnsType } from 'antd/es/table';
import LogLinesActionButtons from 'components/Logs/LogLinesActionButtons/LogLinesActionButtons';
import { ColumnTypeRender } from 'components/Logs/TableView/types';
import { FontSize } from 'container/OptionsMenu/types';
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
	fontSize: FontSize;
}

export default function TableRow({
	tableColumns,
	index,
	log,
	handleSetActiveContextLog,
	logs,
	hasActions,
	fontSize,
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

				return (
					<TableCellStyled
						$isDragColumn={false}
						$isLogIndicator={column.key === 'state-indicator'}
						$isDarkMode={isDarkMode}
						key={column.key}
						fontSize={fontSize}
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
		</>
	);
}
