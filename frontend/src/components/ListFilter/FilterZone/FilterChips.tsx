import { Select } from 'antd';
import cx from 'classnames';

import type { UpdatedWindow } from '../dsl/types';
import type { CreatorOption, EnumChip } from '../types';
import { UPDATED_OPTIONS } from './constants';
import MultiSelectFilter from './MultiSelectFilter';

import styles from './FilterZone.module.scss';

// antd Select cannot carry a null option value, so the clause-less option is this sentinel.
const NO_CLAUSE = '';

interface Props {
	createdBy: string[];
	updated: UpdatedWindow;
	// Omitted when the entity has no creator, which drops the Created-by chip.
	creatorOptions?: CreatorOption[];
	onCreatedByChange: (emails: string[]) => void;
	onUpdatedChange: (window: UpdatedWindow) => void;
	enumChips?: EnumChip[];
	// The reflected value per enum chip key; null when its clause is absent.
	enumValues?: Record<string, string | null>;
	onEnumChange?: (key: string, value: string | null) => void;
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
	enumChips = [],
	enumValues = {},
	onEnumChange,
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
			{enumChips.map((chip) => (
				<Select
					key={chip.key}
					showSearch
					className={cx(styles.select, styles.selectNarrow)}
					placeholder={chip.placeholder}
					value={enumValues[chip.key] ?? NO_CLAUSE}
					options={chip.options.map((option) => ({
						value: option.value ?? NO_CLAUSE,
						label: option.label,
					}))}
					optionFilterProp="label"
					data-testid={`${testIdPrefix}-filter-${chip.key}`}
					disabled={disabled}
					onChange={(value: string): void =>
						onEnumChange?.(chip.key, value === NO_CLAUSE ? null : value)
					}
				/>
			))}
		</div>
	);
}

export default FilterChips;
