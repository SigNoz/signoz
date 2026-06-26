import type { ReactNode } from 'react';
import { Select, Tooltip } from 'antd';

import { SegmentIcon, type SegmentIconName } from '../segmentIcons';

import styles from './ConfigSelect.module.scss';

export interface ConfigSelectItem {
	value: string;
	label: string;
	/** A `SegmentIconName` string (resolved to a glyph), or an arbitrary icon node. */
	icon?: ReactNode;
	disabled?: boolean;
	/** Hover hint shown on the option — typically the reason a disabled item is disabled. */
	tooltip?: string;
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
			options={items.map((item) => {
				const content = item.icon ? (
					<span className={styles.item}>
						{typeof item.icon === 'string' ? (
							<SegmentIcon name={item.icon as SegmentIconName} />
						) : (
							item.icon
						)}
						{item.label}
					</span>
				) : (
					item.label
				);
				return {
					value: item.value,
					disabled: item.disabled,
					label: item.tooltip ? (
						<Tooltip title={item.tooltip} placement="top">
							<span className={styles.tooltipTrigger}>{content}</span>
						</Tooltip>
					) : (
						content
					),
				};
			})}
		/>
	);
}

export default ConfigSelect;
