import { SavedTimeRange } from 'utils/savedTimeRangeUtils';

import SavedTimeRangeItem from './SavedTimeRangeItem';

import styles from './SavedTimeRanges.module.scss';

interface SavedTimeRangesProps {
	ranges: SavedTimeRange[];
	timezone: string;
	onApply: (range: SavedTimeRange) => void;
	onRename: (range: SavedTimeRange, name: string) => void;
	onRemove: (range: SavedTimeRange) => void;
}

function SavedTimeRanges({
	ranges,
	timezone,
	onApply,
	onRename,
	onRemove,
}: SavedTimeRangesProps): JSX.Element {
	return (
		<div className={styles.section} data-testid="saved-time-ranges">
			<div className="time-heading">SAVED</div>
			<div className={styles.list}>
				{ranges.map((range) => (
					<SavedTimeRangeItem
						key={`${range.from}|${range.to}`}
						range={range}
						timezone={timezone}
						onApply={onApply}
						onRename={onRename}
						onRemove={onRemove}
					/>
				))}
			</div>
		</div>
	);
}

export default SavedTimeRanges;
