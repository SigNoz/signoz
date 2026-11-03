import { useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Pin } from '@signozhq/icons';
import { MAX_SAVED_TIME_RANGES } from 'utils/savedTimeRangeUtils';

import TimeRangeNameInput from './TimeRangeNameInput';

import styles from './SavedTimeRanges.module.scss';

interface RecentlyUsedTimeRangeItemProps {
	label: string;
	isSaved: boolean;
	isLimitReached: boolean;
	onApply: () => void;
	onSave: (name: string) => void;
}

function RecentlyUsedTimeRangeItem({
	label,
	isSaved,
	isLimitReached,
	onApply,
	onSave,
}: RecentlyUsedTimeRangeItemProps): JSX.Element {
	const [isNaming, setIsNaming] = useState(false);

	if (isNaming) {
		return (
			<TimeRangeNameInput
				onSubmit={(name): void => {
					onSave(name);
					setIsNaming(false);
				}}
				onCancel={(): void => setIsNaming(false)}
			/>
		);
	}

	return (
		<div className={styles.item}>
			<button
				type="button"
				className={styles.itemApply}
				data-testid="recently-used-time-range-item"
				onClick={onApply}
			>
				<span className={styles.itemRange}>{label}</span>
			</button>
			{!isSaved && (
				<div className={styles.itemActions}>
					<Button
						variant="ghost"
						color="secondary"
						size="sm"
						icon
						testId="recently-used-time-range-pin"
						aria-label={`Save ${label}`}
						disabled={isLimitReached}
						disabledTooltip={`You can save up to ${MAX_SAVED_TIME_RANGES} time ranges. Remove one to save another.`}
						onClick={(): void => setIsNaming(true)}
					>
						<Pin size={12} />
					</Button>
				</div>
			)}
		</div>
	);
}

export default RecentlyUsedTimeRangeItem;
