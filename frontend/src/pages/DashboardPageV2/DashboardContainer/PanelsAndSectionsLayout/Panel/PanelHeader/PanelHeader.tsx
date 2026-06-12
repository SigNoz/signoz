import { useMemo, type ReactNode } from 'react';
import { Typography } from '@signozhq/ui/typography';
import type { Querybuildertypesv5QueryWarnDataDTO as WarningDTO } from 'api/generated/services/sigNoz.schemas';
import { Loader } from '@signozhq/icons';
import cx from 'classnames';

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
	/** Full plugin kind — drives kind-gated menu actions; undefined when absent. */
	panelKind: string | undefined;
	/** Background refresh in flight — shows a subtle spinner without blinking the chart. */
	isFetching: boolean;
	/** Latest query error, if any — surfaced as a header error indicator. */
	error?: Error | null;
	/** Non-fatal query warning lifted from the response payload. */
	warning?: WarningDTO;
	/** Layout context for move/delete — absent outside editable sectioned mode. */
	panelActions?: PanelActionsConfig;
}

/** Panel chrome: drag handle, title, refetch + status indicators, actions. */
function PanelHeader({
	title,
	panelId,
	panelKind,
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
				{/* Renders nothing when no action survives its gates (kind/role/context). */}
				<PanelActionsMenu
					panelId={panelId}
					panelKind={panelKind}
					panelActions={panelActions}
				/>
			</div>
		</div>
	);
}

export default PanelHeader;
