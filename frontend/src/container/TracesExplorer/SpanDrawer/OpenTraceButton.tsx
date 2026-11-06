import { MouseEvent } from 'react';
import { CornerUpRight } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useIsRowHovered } from 'components/TanStackTableView/TanStackTableStateContext';
import {
	logOpenTraceClicked,
	OpenTraceSource,
} from 'container/TracesExplorer/events';
import { getTraceLink } from 'container/TracesExplorer/ListView/utils';
import { TracesTableRow } from 'container/TracesExplorer/TracesTable/getFieldColumn';
import { openInNewTab } from 'utils/navigation';

import styles from './OpenTraceButton.module.scss';

type OpenTraceButtonProps = {
	row: TracesTableRow;
	rowId: string;
};

function OpenTraceButton({
	row,
	rowId,
}: OpenTraceButtonProps): JSX.Element | null {
	const isHovered = useIsRowHovered(rowId);

	const handleClick = (event: MouseEvent): void => {
		// The row click would open the drawer instead.
		event.stopPropagation();
		logOpenTraceClicked(PANEL_TYPES.LIST, OpenTraceSource.RowIcon);
		openInNewTab(getTraceLink(row));
	};

	if (!isHovered) {
		return null;
	}

	return (
		<span className={styles.slot}>
			<Tooltip title="Open trace details">
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					icon
					onClick={handleClick}
					aria-label="Open trace details"
					testId="span-row-open-trace"
				>
					<CornerUpRight size={14} />
				</Button>
			</Tooltip>
		</span>
	);
}

export default OpenTraceButton;
