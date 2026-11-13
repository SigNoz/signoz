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
	onClear?: () => void;
	onDropdownVisibleChange?: (open: boolean) => void;
	disabled?: boolean;
}

function MultiSelectFilter({
	value,
	options,
	placeholder,
	testId,
	onChange,
	onClear,
	onDropdownVisibleChange,
	disabled = false,
}: Props): JSX.Element {
	return (
		<ConfigProvider theme={CHECKBOX_SELECT_THEME}>
			<Select
				mode="multiple"
				showSearch
				allowClear
				className={cx(styles.select, styles.selectWide)}
				placeholder={placeholder}
				value={value}
				options={options}
				optionFilterProp="label"
				maxTagCount={1}
				menuItemSelectedIcon={null}
				data-testid={testId}
				disabled={disabled}
				onClear={onClear}
				optionRender={(option): JSX.Element => (
					<div className={styles.checkOption}>
						<div className={styles.checkOptionBox}>
							<Checkbox
								color="primary"
								value={value.includes(option.value as string)}
							/>
						</div>
						<span className={styles.checkOptionLabel}>{option.label}</span>
					</div>
				)}
				onChange={(next): void => onChange(next as string[])}
				onDropdownVisibleChange={onDropdownVisibleChange}
			/>
		</ConfigProvider>
	);
}

export default MultiSelectFilter;
