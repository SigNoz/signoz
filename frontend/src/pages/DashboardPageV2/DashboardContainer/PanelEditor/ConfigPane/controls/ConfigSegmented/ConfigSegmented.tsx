import { ToggleGroupSimple } from '@signozhq/ui/toggle-group';

import { SegmentIcon, type SegmentIconName } from '../segmentIcons';

import styles from './ConfigSegmented.module.scss';

export interface ConfigSegmentedItem {
	value: string;
	label: string;
	icon?: SegmentIconName;
}

interface ConfigSegmentedProps {
	testId: string;
	value: string | undefined;
	items: ConfigSegmentedItem[];
	onChange: (value: string) => void;
}

/**
 * Inline segmented control for short option sets in the config pane (line style, fill
 * mode, axis scale, legend position). Each segment carries an optional muted glyph that
 * brightens with the selected state (it inherits the toggle's `currentColor`). Built on
 * the Periscope ToggleGroup so it stays theme-faithful.
 */
function ConfigSegmented({
	testId,
	value,
	items,
	onChange,
}: ConfigSegmentedProps): JSX.Element {
	return (
		<ToggleGroupSimple
			type="single"
			testId={testId}
			className={styles.group}
			value={value}
			items={items.map((item) => ({
				value: item.value,
				'aria-label': item.label,
				label: (
					<span className={styles.segment}>
						{item.icon && <SegmentIcon name={item.icon} />}
						{item.label}
					</span>
				),
			}))}
			// Single toggle-groups emit '' when the active segment is re-clicked; ignore that
			// so a required choice (e.g. scale, position) can't be cleared to an empty value.
			onChange={(next: string): void => {
				if (next) {
					onChange(next);
				}
			}}
		/>
	);
}

export default ConfigSegmented;
