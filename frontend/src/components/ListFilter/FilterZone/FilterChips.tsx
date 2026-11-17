import { Select } from 'antd';
import cx from 'classnames';

import type { UpdatedWindow } from '../dsl/types';
import type { CreatorOption } from '../types';
import { UPDATED_OPTIONS } from './constants';
import MultiSelectFilter from './MultiSelectFilter';

import styles from './FilterZone.module.scss';

interface Props {
	createdBy: string[];
	updated: UpdatedWindow;
	// Omitted when the entity has no creator, which drops the Created-by chip.
	creatorOptions?: CreatorOption[];
	onCreatedByChange: (emails: string[]) => void;
	onUpdatedChange: (window: UpdatedWindow) => void;
	// Run the staged draft — fired when a dropdown closes.
	onApply: () => void;
	// Clear all Created-by selections and run immediately.
	onClearCreatedBy: () => void;
	// Ids: `${testIdPrefix}-filter-created-by`, `-filter-updated`.
	testIdPrefix: string;
	disabled?: boolean;
}

function FilterChips({
	createdBy,
	updated,
	creatorOptions,
	onCreatedByChange,
	onUpdatedChange,
	onApply,
	onClearCreatedBy,
	testIdPrefix,
	disabled = false,
}: Props): JSX.Element {
	const creatorOptionsData = creatorOptions?.map((o) => ({
		value: o.email,
		label: o.label,
	}));

	const runOnClose = (open: boolean): void => {
		if (!open) {
			onApply();
		}
	};

	return (
		<div className={styles.chips}>
			{creatorOptionsData && (
				<MultiSelectFilter
					value={createdBy}
					options={creatorOptionsData}
					placeholder="Created by"
					testId={`${testIdPrefix}-filter-created-by`}
					disabled={disabled}
					onClear={onClearCreatedBy}
					onChange={onCreatedByChange}
					onDropdownVisibleChange={runOnClose}
				/>
			)}
			<Select
				showSearch
				className={cx(styles.select, styles.selectNarrow)}
				placeholder="Updated"
				value={updated}
				options={UPDATED_OPTIONS}
				optionFilterProp="label"
				data-testid={`${testIdPrefix}-filter-updated`}
				disabled={disabled}
				onChange={(value): void => onUpdatedChange(value as UpdatedWindow)}
			/>
		</div>
	);
}

export default FilterChips;
