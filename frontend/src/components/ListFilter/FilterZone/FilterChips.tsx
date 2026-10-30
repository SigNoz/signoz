import { Select } from 'antd';
import { Checkbox } from '@signozhq/ui/checkbox';
import cx from 'classnames';

import type { UpdatedWindow } from '../dsl/types';
import type { CreatorOption } from '../types';
import { UPDATED_OPTIONS } from './constants';

import styles from './FilterZone.module.scss';

interface Props {
	createdBy: string[];
	updated: UpdatedWindow;
	creatorOptions: CreatorOption[];
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
	const creatorOptionsData = creatorOptions.map((o) => ({
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
			<Select
				mode="multiple"
				showSearch
				allowClear
				className={cx(styles.select, styles.selectWide)}
				placeholder="Created by"
				value={createdBy}
				options={creatorOptionsData}
				optionFilterProp="label"
				maxTagCount={1}
				menuItemSelectedIcon={null}
				data-testid={`${testIdPrefix}-filter-created-by`}
				disabled={disabled}
				onClear={onClearCreatedBy}
				optionRender={(option): JSX.Element => (
					<div className={styles.creatorOption}>
						<div className={styles.creatorCheck}>
							<Checkbox
								color="primary"
								value={createdBy.includes(option.value as string)}
							/>
						</div>
						<span className={styles.creatorLabel}>{option.label}</span>
					</div>
				)}
				onChange={(value): void => onCreatedByChange(value as string[])}
				onDropdownVisibleChange={runOnClose}
			/>
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
