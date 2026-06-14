import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from '@signozhq/ui/select';

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
 * Single-select dropdown for the panel editor's config sections. Renders the menu
 * inside the editor overlay (`withPortal={false}`) so it isn't trapped behind the
 * overlay — Radix positions it with strategy:"fixed" so the surrounding `overflow:auto`
 * pane doesn't clip it — and sizes the menu to the trigger width.
 */
function ConfigSelect({
	testId,
	value,
	placeholder,
	items,
	onChange,
}: ConfigSelectProps): JSX.Element {
	return (
		<Select
			value={value}
			onChange={(next): void => {
				if (typeof next === 'string') {
					onChange(next);
				}
			}}
		>
			<SelectTrigger testId={testId} placeholder={placeholder} />
			<SelectContent withPortal={false} className={styles.content}>
				{items.map((item) => (
					<SelectItem key={item.value} value={item.value}>
						{item.icon ? (
							<span className={styles.item}>
								<SegmentIcon name={item.icon} />
								{item.label}
							</span>
						) : (
							item.label
						)}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

export default ConfigSelect;
