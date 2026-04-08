import {
	ComponentProps,
	CSSProperties,
	memo,
	useCallback,
	useMemo,
	useState,
} from 'react';
import { TableComponents } from 'react-virtuoso';
import cx from 'classnames';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { ILog } from 'types/api/logs/log';

import {
	getLogIndicatorType,
	getLogIndicatorTypeForTable,
} from '../Logs/LogStateIndicator/utils';
import { getRowBackgroundColor } from './getRowBackgroundColor';
import RowHoverContext from './RowHoverContext';
import { TanStackTableRowData } from './types';

import tableStyles from './TanStackTable.module.scss';

export type TableRowContext = {
	activeLog?: ILog | null;
	activeContextLog?: ILog | null;
	logsById: Map<string, ILog>;
};

type VirtuosoTableRowProps = ComponentProps<
	NonNullable<TableComponents<TanStackTableRowData, TableRowContext>['TableRow']>
>;

type TanStackCustomTableRowProps = VirtuosoTableRowProps;

function TanStackCustomTableRow({
	children,
	item,
	context,
	...props
}: TanStackCustomTableRowProps): JSX.Element {
	const { isHighlighted } = useCopyLogLink(item.currentLog.id);
	const isDarkMode = useIsDarkMode();
	const [hasHovered, setHasHovered] = useState(false);
	const rowId = String(item.currentLog.id ?? '');
	const activeLog = context?.activeLog;
	const activeContextLog = context?.activeContextLog;
	const logsById = context?.logsById;
	const rowLog = logsById?.get(rowId) || item.currentLog;
	const logType = rowLog
		? getLogIndicatorType(rowLog)
		: getLogIndicatorTypeForTable(item.log);

	const handleMouseEnter = useCallback(() => {
		if (!hasHovered) {
			setHasHovered(true);
		}
	}, [hasHovered]);

	const isActiveLog =
		isHighlighted ||
		rowId === String(activeLog?.id ?? '') ||
		rowId === String(activeContextLog?.id ?? '');

	const rowClassName = useMemo(
		() => cx(tableStyles.tableRow, isActiveLog && tableStyles.tableRowActive),
		[isActiveLog],
	);

	const rowStyle = useMemo(
		(): CSSProperties =>
			({
				'--row-active-bg': getRowBackgroundColor(isDarkMode, logType),
				'--row-hover-bg': getRowBackgroundColor(isDarkMode, logType),
			} as CSSProperties),
		[isDarkMode, logType],
	);

	return (
		<RowHoverContext.Provider value={hasHovered}>
			<tr
				{...props}
				className={rowClassName}
				style={rowStyle}
				data-dark-mode={isDarkMode}
				data-log-type={logType}
				onMouseEnter={handleMouseEnter}
			>
				{children}
			</tr>
		</RowHoverContext.Provider>
	);
}

export default memo(TanStackCustomTableRow, (prev, next) => {
	const prevId = String(prev.item.currentLog.id ?? '');
	const nextId = String(next.item.currentLog.id ?? '');
	if (prevId !== nextId) {
		return false;
	}

	const prevIsActive =
		prevId === String(prev.context?.activeLog?.id ?? '') ||
		prevId === String(prev.context?.activeContextLog?.id ?? '');
	const nextIsActive =
		nextId === String(next.context?.activeLog?.id ?? '') ||
		nextId === String(next.context?.activeContextLog?.id ?? '');
	return prevIsActive === nextIsActive;
});
