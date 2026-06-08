import type { ReactNode } from 'react';
import { Badge } from '@signozhq/ui/badge';
import { Typography } from '@signozhq/ui/typography';
import { EllipsisVertical, Loader } from '@signozhq/icons';
import cx from 'classnames';

import type { PanelActionsConfig } from './Panel';
import PanelActionsMenu from './PanelActionsMenu/PanelActionsMenu';
import styles from './Panel.module.scss';

interface PanelHeaderProps {
	title: ReactNode;
	kind: string;
	panelId: string;
	/** Background refresh in flight — shows a subtle spinner without blinking the chart. */
	isFetching: boolean;
	/** Move/delete actions — present only in editable sectioned mode. */
	panelActions?: PanelActionsConfig;
}

/** Panel chrome: drag handle, title, kind badge, refetch indicator, actions. */
function PanelHeader({
	title,
	kind,
	panelId,
	isFetching,
	panelActions,
}: PanelHeaderProps): JSX.Element {
	return (
		<div className={cx(styles.header, 'panel-drag-handle')}>
			<div className={styles.headerLeft}>
				<Typography.Text className={styles.headerTitle}>{title}</Typography.Text>
				<Badge className={styles.badge}>{kind}</Badge>
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
				{panelActions ? (
					<PanelActionsMenu
						panelId={panelId}
						currentLayoutIndex={panelActions.currentLayoutIndex}
						sections={panelActions.sections}
						onMovePanel={panelActions.onMovePanel}
						onDeletePanel={panelActions.onDeletePanel}
					/>
				) : (
					<EllipsisVertical size={14} />
				)}
			</div>
		</div>
	);
}

export default PanelHeader;
