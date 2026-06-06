import { useMemo } from 'react';
import { Badge } from '@signozhq/ui/badge';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import { EllipsisVertical } from '@signozhq/icons';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';

import type { DashboardSection } from '../../utils';
import type { DeletePanelArgs } from './hooks/useDeletePanel';
import type { MovePanelArgs } from './hooks/useMovePanelToSection';
import PanelActionsMenu from './PanelActionsMenu/PanelActionsMenu';
import styles from './Panel.module.scss';

interface Props {
	panel: DashboardtypesPanelDTO | undefined;
	panelId: string;
	/**
	 * Placeholder: true once this panel's section enters the viewport. The panel
	 * query-loading implementation (later PR) will consume this to lazily fetch
	 * data. Currently unused on purpose.
	 */
	isVisible?: boolean;
	/** Section actions — present only in editable sectioned mode. */
	currentLayoutIndex?: number;
	sections?: DashboardSection[];
	onMovePanel?: (args: MovePanelArgs) => void;
	onDeletePanel?: (args: DeletePanelArgs) => void;
}

function Panel({
	panel,
	panelId,
	isVisible,
	currentLayoutIndex,
	sections,
	onMovePanel,
	onDeletePanel,
}: Props): JSX.Element {
	const name = panel?.spec?.display?.name || `Panel ${panelId.slice(0, 6)}`;
	const description = panel?.spec?.display?.description;
	const kind = panel?.spec?.plugin?.kind?.replace(/^signoz\//, '') ?? 'unknown';
	const queryCount = panel?.spec?.queries?.length ?? 0;

	const headerTitle = useMemo(() => {
		if (!description) {
			return name;
		}
		return (
			<TooltipSimple title={description}>
				<span>{name}</span>
			</TooltipSimple>
		);
	}, [name, description]);

	return (
		<div
			className={styles.panel}
			data-panel-visible={isVisible ? 'true' : 'false'}
		>
			<div className={cx(styles.header, 'panel-drag-handle')}>
				<div className={styles.headerLeft}>
					<Typography.Text className={styles.headerTitle}>
						{headerTitle}
					</Typography.Text>
					<Badge className={styles.badge}>{kind}</Badge>
				</div>
				{currentLayoutIndex !== undefined && (onMovePanel || onDeletePanel) ? (
					<PanelActionsMenu
						panelId={panelId}
						currentLayoutIndex={currentLayoutIndex}
						sections={sections ?? []}
						onMovePanel={onMovePanel}
						onDeletePanel={onDeletePanel}
					/>
				) : (
					<EllipsisVertical size={14} />
				)}
			</div>

			<div className={styles.body}>
				<div>
					<div className={styles.bodyKind}>{kind} panel</div>
					<div>
						{queryCount} {queryCount === 1 ? 'query' : 'queries'} · chart rendering
						coming next
					</div>
				</div>
			</div>
		</div>
	);
}

export default Panel;
