import { X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';

import styles from './SavedViewsPanel.module.scss';

function SavedViewsPanel({
	source,
	onClose,
}: {
	source: SavedviewtypesSourceDTO;
	// Absent when the list is always on screen.
	onClose?: () => void;
}): JSX.Element {
	return (
		<div
			className={styles.panel}
			data-testid="saved-views-panel"
			data-source={source}
		>
			<div className={styles.header}>
				<Typography.Text className={styles.title}>All views</Typography.Text>
				{onClose && (
					<Button
						variant="ghost"
						color="secondary"
						size="icon"
						aria-label="Close"
						prefix={<X size={14} />}
						onClick={onClose}
						data-testid="saved-views-close"
					/>
				)}
			</div>
		</div>
	);
}

export default SavedViewsPanel;
