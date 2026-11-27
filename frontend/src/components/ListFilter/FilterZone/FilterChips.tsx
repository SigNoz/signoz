import { Select } from 'antd';
import cx from 'classnames';

import type { UpdatedWindow } from '../dsl/types';
import type { CreatorOption } from '../types';
import { UPDATED_OPTIONS } from './constants';
import MultiSelectFilter from './MultiSelectFilter';

import styles from './FilterZone.module.scss';

// The Created-by chip and everything that drives it exist together or not at all.
export type CreatedByProps =
	| {
			creatorOptions: CreatorOption[];
			createdBy: string[];
			onCreatedByChange: (emails: string[]) => void;
			// Run a Created-by change made with the dropdown closed.
			onCreatedByCommit: (emails: string[]) => void;
	  }
	| {
			creatorOptions?: undefined;
			createdBy?: undefined;
			onCreatedByChange?: undefined;
			onCreatedByCommit?: undefined;
	  };

type Props = CreatedByProps & {
	updated: UpdatedWindow;
	onUpdatedChange: (window: UpdatedWindow) => void;
	// Run the staged draft — fired when a dropdown closes.
	onApply: () => void;
	// Ids: `${testIdPrefix}-filter-created-by`, `-filter-updated`.
	testIdPrefix: string;
	disabled?: boolean;
};

function FilterChips(props: Props): JSX.Element {
	const {
		updated,
		onUpdatedChange,
		onApply,
		testIdPrefix,
		disabled = false,
	} = props;

	const runOnClose = (open: boolean): void => {
		if (!open) {
			onApply();
		}
	};

	return (
		<div className={styles.chips}>
			{props.creatorOptions && (
				<MultiSelectFilter
					value={props.createdBy}
					options={props.creatorOptions.map((o) => ({
						value: o.email,
						label: o.label,
					}))}
					placeholder="Created by"
					testId={`${testIdPrefix}-filter-created-by`}
					disabled={disabled}
					onChange={props.onCreatedByChange}
					onCommit={props.onCreatedByCommit}
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
