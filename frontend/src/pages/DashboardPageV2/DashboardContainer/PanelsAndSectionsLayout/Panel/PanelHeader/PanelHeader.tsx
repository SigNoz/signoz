import { useMemo, type ReactNode } from 'react';
import { Typography } from '@signozhq/ui/typography';
import { Loader } from '@signozhq/icons';
import cx from 'classnames';
import type { Warning } from 'types/api';

import type { PanelActionsConfig } from '../Panel';
import PanelActionsMenu from '../PanelActionsMenu/PanelActionsMenu';
import PanelStatusPopover from '../PanelStatus/PanelStatusPopover';
import {
	panelStatusFromError,
	panelStatusFromWarning,
} from '../PanelStatus/utils';
import styles from './PanelHeader.module.scss';

interface PanelHeaderProps {
	title: ReactNode;
	panelId: string;
	/** Background refresh in flight — shows a subtle spinner without blinking the chart. */
	isFetching: boolean;
	/** Latest query error, if any — surfaced as a header error indicator. */
	error?: Error | null;
	/** Non-fatal query warning lifted from the response payload. */
	warning?: Warning;
	/** Move/delete actions — present only in editable sectioned mode. */
	panelActions?: PanelActionsConfig;
}

/** Panel chrome: drag handle, title, refetch + status indicators, actions. */
function PanelHeader({
	title,
	panelId,
	isFetching,
	error,
	warning,
	panelActions,
}: PanelHeaderProps): JSX.Element {
	const errorDetail = useMemo(() => panelStatusFromError(error), [error]);

	const warningDetail = useMemo(
		() => panelStatusFromWarning(warning),
		[warning],
	);

	return (
		<div className={cx(styles.header, 'panel-drag-handle')}>
			<div className={styles.headerLeft}>
				<Typography.Text className={styles.headerTitle}>{title}</Typography.Text>
				{isFetching && (
					<Loader
						size={12}
						className={cx('animate-spin', styles.refetchIndicator)}
						data-testid="panel-refetching"
					/>
				)}
			</div>
			{/* `panel-no-drag` opts this region out of the grid drag handle so the
			    actions menu is clickable instead of starting a panel drag. */}
			<div className={cx('panel-no-drag', styles.actions)}>
				{errorDetail && <PanelStatusPopover variant="error" detail={errorDetail} />}
				{warningDetail && (
					<PanelStatusPopover variant="warning" detail={warningDetail} />
				)}
				{panelActions && (
					<PanelActionsMenu
						panelId={panelId}
						currentLayoutIndex={panelActions.currentLayoutIndex}
						sections={panelActions.sections}
						onMovePanel={panelActions.onMovePanel}
						onDeletePanel={panelActions.onDeletePanel}
					/>
				)}
			</div>
		</div>
	);
}

export default PanelHeader;
