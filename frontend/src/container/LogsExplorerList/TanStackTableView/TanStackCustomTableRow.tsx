import { ComponentProps, memo, useCallback, useState } from 'react';
import { TableComponents } from 'react-virtuoso';
import {
	getLogIndicatorType,
	getLogIndicatorTypeForTable,
} from 'components/Logs/LogStateIndicator/utils';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { ILog } from 'types/api/logs/log';

import { TableRowStyled } from '../InfinityTableView/styles';
import RowHoverContext from '../RowHoverContext';
import { TanStackTableRowData } from './types';

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

	return (
		<RowHoverContext.Provider value={hasHovered}>
			<TableRowStyled
				{...props}
				$isDarkMode={isDarkMode}
				$isActiveLog={
					isHighlighted ||
					rowId === String(activeLog?.id ?? '') ||
					rowId === String(activeContextLog?.id ?? '')
				}
				$logType={logType}
				onMouseEnter={handleMouseEnter}
			>
				{children}
			</TableRowStyled>
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
