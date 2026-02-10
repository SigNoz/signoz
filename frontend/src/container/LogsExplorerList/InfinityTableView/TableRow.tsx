import {
	cloneElement,
	MouseEventHandler,
	ReactElement,
	ReactNode,
	useCallback,
	useMemo,
} from 'react';
import { ColumnsType } from 'antd/es/table';
import { VIEW_TYPES } from 'components/LogDetail/constants';
import LogLinesActionButtons from 'components/Logs/LogLinesActionButtons/LogLinesActionButtons';
import { ColumnTypeRender } from 'components/Logs/TableView/types';
import { FontSize } from 'container/OptionsMenu/types';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { ILog } from 'types/api/logs/log';

import { TableCellStyled } from './styles';

import './TableRow.styles.scss';

interface TableRowProps {
	tableColumns: ColumnsType<Record<string, unknown>>;
	index: number;
	log: Record<string, unknown>;
	onShowLogDetails?: (
		log: ILog,
		selectedTab?: typeof VIEW_TYPES[keyof typeof VIEW_TYPES],
	) => void;
	logs: ILog[];
	hasActions: boolean;
	fontSize: FontSize;
	isActiveLog?: boolean;
	onClearActiveLog?: () => void;
}

export default function TableRow({
	tableColumns,
	index,
	log,
	onShowLogDetails,
	logs,
	hasActions,
	fontSize,
	isActiveLog,
	onClearActiveLog,
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
			if (!currentLog) {
				return;
			}

			onShowLogDetails?.(currentLog, VIEW_TYPES.CONTEXT);
		},
		[currentLog, onShowLogDetails],
	);

	const handleShowLogDetails = useCallback(() => {
		if (!currentLog) {
			return;
		}

		// If this log is already active, close the detail drawer
		if (isActiveLog && onClearActiveLog) {
			onClearActiveLog();
			return;
		}

		// Otherwise, open the detail drawer for this log
		if (onShowLogDetails) {
			onShowLogDetails(currentLog);
		}
	}, [currentLog, onShowLogDetails, isActiveLog, onClearActiveLog]);

	const hasSingleColumn =
		tableColumns.filter((column) => column.key !== 'state-indicator').length ===
		1;

	return (
		<>
			{tableColumns.map((column) => {
				if (!column.key) {
					return null;
				}

				if (!column.render) {
					return <td key={column.key}>Empty</td>;
				}

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
						$hasSingleColumn={hasSingleColumn}
						$isDarkMode={isDarkMode}
						key={column.key}
						fontSize={fontSize}
						columnKey={column.key as string}
						onClick={handleShowLogDetails}
						className={column.key as string}
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
