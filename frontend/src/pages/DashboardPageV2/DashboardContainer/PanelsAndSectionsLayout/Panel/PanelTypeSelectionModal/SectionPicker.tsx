import { useMemo } from 'react';
// eslint-disable-next-line signoz/no-antd-components
import { Select } from 'antd';

import type { SectionOption } from './types';
import styles from './SectionPicker.module.scss';

interface SectionPickerProps {
	options: SectionOption[];
	value: string;
	onChange: (value: string) => void;
}

function SectionPicker({
	options,
	value,
	onChange,
}: SectionPickerProps): JSX.Element {
	// `selectedLabel` (one line) shows in the trigger; `label` (two lines) in the list.
	const selectOptions = useMemo(
		() =>
			options.map((option) => {
				const iconClass = option.isRoot ? styles.rootIcon : styles.sectionIcon;
				return {
					value: option.value,
					selectedLabel: (
						<span className={styles.triggerValue}>
							<option.Icon size={16} className={iconClass} />
							<span className={styles.triggerLabel}>{option.label}</span>
						</span>
					),
					label: (
						<span
							className={styles.optionRow}
							data-testid={`panel-section-option-${option.layoutIndex}`}
						>
							<option.Icon size={16} className={iconClass} />
							<span className={styles.optionText}>
								<span className={styles.optionLabel}>{option.label}</span>
								<span className={styles.optionDescription}>{option.description}</span>
							</span>
						</span>
					),
				};
			}),
		[options],
	);

	return (
		<Select<string>
			className={styles.select}
			popupClassName={styles.dropdown}
			value={value}
			onChange={onChange}
			data-testid="panel-section-select"
			optionLabelProp="selectedLabel"
			getPopupContainer={(trigger): HTMLElement =>
				trigger.parentElement ?? document.body
			}
			options={selectOptions}
		/>
	);
}

export default SectionPicker;
