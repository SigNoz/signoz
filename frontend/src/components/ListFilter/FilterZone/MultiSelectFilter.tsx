import { useState } from 'react';
import { ConfigProvider, Select } from 'antd';
import { Checkbox } from '@signozhq/ui/checkbox';
import cx from 'classnames';

import styles from './FilterZone.module.scss';

// The option checkbox already marks selection, so selected rows stay regular weight.
const CHECKBOX_SELECT_THEME = {
	components: { Select: { optionSelectedFontWeight: 400 } },
};

export interface MultiSelectFilterOption {
	value: string;
	label: string;
}

interface Props {
	value: string[];
	options: MultiSelectFilterOption[];
	placeholder: string;
	testId: string;
	onChange: (values: string[]) => void;
	// A change made with the dropdown closed (a tag's ×, the clear icon) has no
	// close to run on, so it is committed here instead of staged via onChange.
	onCommit?: (values: string[]) => void;
	onDropdownVisibleChange?: (open: boolean) => void;
	disabled?: boolean;
}

function MultiSelectFilter({
	value,
	options,
	placeholder,
	testId,
	onChange,
	onCommit,
	onDropdownVisibleChange,
	disabled = false,
}: Props): JSX.Element {
	const [open, setOpen] = useState(false);

	const handleChange = (next: string[]): void => {
		if (!open && onCommit) {
			onCommit(next);
			return;
		}
		onChange(next);
	};

	const handleDropdownVisibleChange = (nextOpen: boolean): void => {
		setOpen(nextOpen);
		onDropdownVisibleChange?.(nextOpen);
	};

	return (
		<ConfigProvider theme={CHECKBOX_SELECT_THEME}>
			<Select
				mode="multiple"
				showSearch
				allowClear
				className={cx(styles.select, styles.selectWide)}
				placeholder={placeholder}
				aria-label={placeholder}
				value={value}
				options={options}
				optionFilterProp="label"
				maxTagCount={1}
				menuItemSelectedIcon={null}
				data-testid={testId}
				disabled={disabled}
				optionRender={(option): JSX.Element => (
					<div
						className={styles.checkOption}
						data-testid={`${testId}-option-${String(option.value)}`}
					>
						<div className={styles.checkOptionBox}>
							<Checkbox
								color="primary"
								value={value.includes(option.value as string)}
							/>
						</div>
						<span className={styles.checkOptionLabel}>{option.label}</span>
					</div>
				)}
				onChange={(next): void => handleChange(next as string[])}
				onDropdownVisibleChange={handleDropdownVisibleChange}
			/>
		</ConfigProvider>
	);
}

export default MultiSelectFilter;
