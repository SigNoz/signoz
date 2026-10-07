import { Menu } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';

import styles from './SavedViewsHeader.module.scss';

// Temp Placeholder data till main functionality is plugged in
const PLACEHOLDER_VIEW_NAME = 'My view';

function SavedViewsHeader({
	source,
	onOpenViews,
}: {
	source: SavedviewtypesSourceDTO;
	// Absent when the list is always on screen.
	onOpenViews?: () => void;
}): JSX.Element {
	return (
		<div
			className={styles.header}
			data-testid="saved-views-header"
			data-source={source}
		>
			<Typography.Text className={styles.name}>
				{PLACEHOLDER_VIEW_NAME}
			</Typography.Text>
			{onOpenViews && (
				<Button
					variant="ghost"
					color="secondary"
					size="icon"
					aria-label="All views"
					prefix={<Menu size={14} />}
					onClick={onOpenViews}
					data-testid="saved-views-open"
				/>
			)}
		</div>
	);
}

export default SavedViewsHeader;
