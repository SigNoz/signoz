import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { Checkbox } from '@signozhq/ui/checkbox';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import { BadgeConfig } from './itemRules';
import { CheckedState } from '../../../types';
import styles from './CheckboxFilterV2ValueRow.module.scss';

interface ValueRowProps {
	value: string;
	checkedState: CheckedState;
	disabled: boolean;
	title: string;
	onlyButtonLabel: string;
	customRendererForValue?: (value: string) => JSX.Element;
	onCheckboxChange: (checked: boolean, previousState: CheckedState) => void;
	onOnlyOrAllClick: () => void;
	badge: BadgeConfig | null;
}

function toCheckboxValue(state: CheckedState): boolean | 'indeterminate' {
	if (state === 'indeterminate') {
		return 'indeterminate';
	}
	return state === 'checked';
}

const INDICATOR_CLASS_MAP = {
	false: styles.indicatorFalse,
	true: styles.indicatorTrue,
} as Record<string, string>;

export function CheckboxFilterV2ValueRow({
	value,
	checkedState,
	disabled,
	title,
	onlyButtonLabel,
	customRendererForValue,
	onCheckboxChange,
	onOnlyOrAllClick,
	badge,
}: ValueRowProps): JSX.Element {
	const indicatorClass = INDICATOR_CLASS_MAP[value];

	return (
		<div
			className={styles.valueRow}
			data-testid={`checkbox-value-row-${value}`}
			data-state={checkedState}
			data-disabled={disabled}
		>
			<div className={styles.checkbox}>
				<Checkbox
					onChange={(isChecked): void =>
						onCheckboxChange(isChecked === true, checkedState)
					}
					value={toCheckboxValue(checkedState)}
					disabled={disabled}
					color="primary"
					testId={`checkbox-${title}-${value}`}
				/>
			</div>

			<div
				role="button"
				tabIndex={disabled ? -1 : 0}
				className={cx(styles.valueButton, disabled && styles.isDisabled)}
				onClick={(): void => {
					if (disabled) {
						return;
					}
					onOnlyOrAllClick();
				}}
				onKeyDown={(e): void => {
					if (disabled) {
						return;
					}
					if (e.key === 'Enter' || e.key === ' ') {
						onOnlyOrAllClick();
					}
				}}
			>
				<div className={styles.content}>
					{indicatorClass && <div className={indicatorClass} />}
					{customRendererForValue ? (
						customRendererForValue(value)
					) : (
						<Typography.Text title={value} className={styles.valueLabel}>
							{value}
						</Typography.Text>
					)}
				</div>

				<div className={styles.actions}>
					{badge && (
						<Badge
							variant="outline"
							color={badge.color}
							className={styles.badge}
							testId={`badge-${badge.key}`}
						>
							{badge.label}
						</Badge>
					)}
					<Button variant="ghost" color="secondary" className={styles.onlyButton}>
						{onlyButtonLabel}
					</Button>
					<Button variant="ghost" color="secondary" className={styles.toggleButton}>
						Toggle
					</Button>
				</div>
			</div>
		</div>
	);
}
