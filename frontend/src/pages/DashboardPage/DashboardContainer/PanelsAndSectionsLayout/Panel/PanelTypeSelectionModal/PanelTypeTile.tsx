import { TooltipSimple } from '@signozhq/ui/tooltip';
import cx from 'classnames';

import type { PanelTypeItem } from './panelTypeCatalog';
import PanelTypePreview from './PanelTypePreview';

import styles from './PanelTypeBrowser.module.scss';

interface PanelTypeTileProps {
	item: PanelTypeItem;
	isSelected: boolean;
	/** Why the kind can't be picked; the tile is disabled when set. */
	disabledReason?: string;
	onSelect: () => void;
}

function PanelTypeTile({
	item,
	isSelected,
	disabledReason,
	onSelect,
}: PanelTypeTileProps): JSX.Element {
	const tile = (
		<button
			type="button"
			className={cx(styles.tile, {
				[styles.tileSelected]: isSelected,
				[styles.tileDisabled]: !!disabledReason,
			})}
			data-testid={`panel-type-${item.kind}`}
			aria-pressed={isSelected}
			// aria-disabled, not disabled, so the reason tooltip still gets hover events.
			aria-disabled={!!disabledReason}
			onClick={disabledReason ? undefined : onSelect}
		>
			<PanelTypePreview kind={item.kind} />
			<span className={styles.tileText}>
				<span className={styles.tileTitle}>
					<span className={styles.tileName}>{item.displayName}</span>
					{item.isNew && <span className={styles.newBadge}>New</span>}
				</span>
				<span className={styles.tileDescription}>{item.description}</span>
			</span>
		</button>
	);

	return disabledReason ? (
		<TooltipSimple title={disabledReason}>{tile}</TooltipSimple>
	) : (
		tile
	);
}

export default PanelTypeTile;
