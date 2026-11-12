import { useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Pencil, X } from '@signozhq/icons';
import { SavedTimeRange } from 'utils/savedTimeRangeUtils';

import TimeRangeNameInput from './TimeRangeNameInput';
import { formatTimeRangeLabel } from './utils';

import styles from './SavedTimeRanges.module.scss';

interface SavedTimeRangeItemProps {
	range: SavedTimeRange;
	timezone: string;
	onApply: (range: SavedTimeRange) => void;
	onRename: (range: SavedTimeRange, name: string) => void;
	onRemove: (range: SavedTimeRange) => void;
}

function SavedTimeRangeItem({
	range,
	timezone,
	onApply,
	onRename,
	onRemove,
}: SavedTimeRangeItemProps): JSX.Element {
	const [isRenaming, setIsRenaming] = useState(false);

	if (isRenaming) {
		return (
			<TimeRangeNameInput
				initialName={range.name}
				onSubmit={(name): void => {
					onRename(range, name);
					setIsRenaming(false);
				}}
				onCancel={(): void => setIsRenaming(false)}
			/>
		);
	}

	return (
		<div className={styles.item}>
			<button
				type="button"
				className={styles.itemApply}
				data-testid="saved-time-range-item"
				onClick={(): void => onApply(range)}
			>
				<span className={styles.itemName}>{range.name}</span>
				<span className={styles.itemRange}>
					{formatTimeRangeLabel(range.from, range.to, timezone)}
				</span>
			</button>
			<div className={styles.itemActions}>
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					icon
					testId="saved-time-range-rename"
					aria-label={`Rename ${range.name}`}
					onClick={(): void => setIsRenaming(true)}
				>
					<Pencil size={12} />
				</Button>
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					icon
					testId="saved-time-range-remove"
					aria-label={`Remove ${range.name}`}
					onClick={(): void => onRemove(range)}
				>
					<X size={12} />
				</Button>
			</div>
		</div>
	);
}

export default SavedTimeRangeItem;
