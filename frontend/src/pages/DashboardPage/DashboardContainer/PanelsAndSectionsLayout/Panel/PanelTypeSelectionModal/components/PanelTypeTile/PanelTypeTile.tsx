import { Tooltip } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import type { PanelTypeItem } from '../PanelTypeBrowser/panelTypeCatalog';
import PanelTypePreview from '../PanelTypePreview/PanelTypePreview';

import styles from './PanelTypeTile.module.scss';

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
					<Typography
						variant="label"
						size="base"
						weight="medium"
						color="main"
						as="span"
						textOverflow="wrap"
					>
						{item.displayName}
					</Typography>
					{item.isNew && <span className={styles.newBadge}>New</span>}
				</span>
				<Typography
					variant="paragraph"
					size="small"
					weight="regular"
					color="secondary"
					as="span"
					textOverflow="wrap"
				>
					{item.description}
				</Typography>
			</span>
		</button>
	);

	return disabledReason ? (
		<Tooltip title={disabledReason}>{tile}</Tooltip>
	) : (
		tile
	);
}

export default PanelTypeTile;
