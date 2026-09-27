import cx from 'classnames';

import type { PanelTypeItem } from './panelTypeCatalog';
import PanelTypePreview from './PanelTypePreview';

import styles from './PanelTypeBrowser.module.scss';

interface PanelTypeTileProps {
	item: PanelTypeItem;
	isSelected: boolean;
	onSelect: () => void;
}

function PanelTypeTile({
	item,
	isSelected,
	onSelect,
}: PanelTypeTileProps): JSX.Element {
	return (
		<button
			type="button"
			className={cx(styles.tile, { [styles.tileSelected]: isSelected })}
			data-testid={`panel-type-${item.kind}`}
			aria-pressed={isSelected}
			onClick={onSelect}
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
}

export default PanelTypeTile;
