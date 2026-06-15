import { Select } from 'antd';

import { SegmentIcon, type SegmentIconName } from '../segmentIcons';

import styles from './ConfigSelect.module.scss';

export interface ConfigSelectItem {
	value: string;
	label: string;
	icon?: SegmentIconName;
}

interface ConfigSelectProps {
	testId: string;
	value: string | undefined;
	placeholder?: string;
	items: ConfigSelectItem[];
	onChange: (value: string) => void;
}

/**
 * Single-select dropdown for the panel editor's config sections. Built on antd's
 * `Select` so it matches the rest of the editor's antd controls; the menu portals to
 * `document.body` (antd default) so the surrounding `overflow:auto` pane can't clip it.
 */
function ConfigSelect({
	testId,
	value,
	placeholder,
	items,
	onChange,
}: ConfigSelectProps): JSX.Element {
	return (
		<Select<string>
			className={styles.select}
			data-testid={testId}
			value={value}
			placeholder={placeholder}
			onChange={onChange}
			virtual={false}
			options={items.map((item) => ({
				value: item.value,
				label: item.icon ? (
					<span className={styles.item}>
						<SegmentIcon name={item.icon} />
						{item.label}
					</span>
				) : (
					item.label
				),
			}))}
		/>
	);
}

export default ConfigSelect;
