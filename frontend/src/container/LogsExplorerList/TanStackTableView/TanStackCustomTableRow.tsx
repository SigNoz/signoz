import { ComponentProps } from 'react';
import { TableComponents } from 'react-virtuoso';
import {
	getLogIndicatorType,
	getLogIndicatorTypeForTable,
} from 'components/Logs/LogStateIndicator/utils';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { ILog } from 'types/api/logs/log';

import { TableRowStyled } from '../InfinityTableView/styles';
import { TanStackTableRowData } from './types';

type VirtuosoTableRowProps = ComponentProps<
	NonNullable<TableComponents<TanStackTableRowData>['TableRow']>
>;

export type TanStackCustomTableRowProps = VirtuosoTableRowProps & {
	activeLog?: ILog | null;
	activeContextLog?: ILog | null;
	logsById: Map<string, ILog>;
};

function TanStackCustomTableRow({
	children,
	item,
	activeLog,
	activeContextLog,
	logsById,
	...props
}: TanStackCustomTableRowProps): JSX.Element {
	const { isHighlighted } = useCopyLogLink(item.currentLog.id);
	const isDarkMode = useIsDarkMode();
	const rowId = String(item.currentLog.id ?? '');
	const rowLog = logsById.get(rowId) || item.currentLog;
	const logType = rowLog
		? getLogIndicatorType(rowLog)
		: getLogIndicatorTypeForTable(item.log);

	return (
		<TableRowStyled
			{...props}
			$isDarkMode={isDarkMode}
			$isActiveLog={
				isHighlighted ||
				rowId === String(activeLog?.id ?? '') ||
				rowId === String(activeContextLog?.id ?? '')
			}
			$logType={logType}
		>
			{children}
		</TableRowStyled>
	);
}

export default TanStackCustomTableRow;
