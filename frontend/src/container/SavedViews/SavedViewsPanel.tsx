import { useState } from 'react';
import { TowerControl, X } from '@signozhq/icons';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';

import SavedViewsIconButton from './SavedViewsIconButton';
import SavedViewsList from './SavedViewsList';

import styles from './SavedViewsPanel.module.scss';

function SavedViewsPanel({
	source,
	onClose,
}: {
	source: SavedviewtypesSourceDTO;
	// Absent when the list is always on screen.
	onClose?: () => void;
}): JSX.Element {
	const [search, setSearch] = useState('');

	return (
		<div
			className={styles.panel}
			data-testid="saved-views-panel"
			data-source={source}
		>
			<div className={styles.header}>
				<div className={styles.title}>
					<TowerControl size={16} />
					<Typography.Text className={styles.titleText}>All views</Typography.Text>
				</div>
				{onClose && (
					<SavedViewsIconButton
						title="Close"
						icon={<X size={14} />}
						onClick={onClose}
						testId="saved-views-close"
					/>
				)}
			</div>
			<div className={styles.search}>
				<Input
					value={search}
					onChange={(event): void => setSearch(event.target.value)}
					placeholder="Search..."
					aria-label="Search views"
					testId="saved-views-search"
				/>
			</div>
			<SavedViewsList source={source} search={search} />
		</div>
	);
}

export default SavedViewsPanel;
