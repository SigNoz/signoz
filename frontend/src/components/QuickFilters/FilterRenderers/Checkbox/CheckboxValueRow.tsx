import { Button } from 'antd';
import { Checkbox } from '@signozhq/ui/checkbox';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
import { Tooltip } from '@signozhq/ui/tooltip';

interface CheckboxValueRowProps {
	value: string;
	checked: boolean;
	disabled: boolean;
	disabledTooltip?: string;
	title: string;
	onlyButtonLabel: string;
	customRendererForValue?: (value: string) => JSX.Element;
	onCheckboxChange: (checked: boolean) => void;
	onOnlyOrAllClick: () => void;
}

function CheckboxValueRow({
	value,
	checked,
	disabled,
	disabledTooltip,
	title,
	onlyButtonLabel,
	customRendererForValue,
	onCheckboxChange,
	onOnlyOrAllClick,
}: CheckboxValueRowProps): JSX.Element {
	return (
		<div className="value">
			<Checkbox
				color="primary"
				disabledTooltip={disabledTooltip}
				onChange={(isChecked): void => onCheckboxChange(isChecked === true)}
				value={checked}
				disabled={disabled}
			/>

			<div
				className={cx('checkbox-value-section', disabled ? 'filter-disabled' : '')}
				onClick={(): void => {
					if (disabled) {
						return;
					}
					onOnlyOrAllClick();
				}}
			>
				<div className={`${title} label-${value}`} />
				{customRendererForValue ? (
					customRendererForValue(value)
				) : (
					<Tooltip title={String(value)} side="top" align="start">
						<Typography.Text className="value-string" truncate={1}>
							{String(value)}
						</Typography.Text>
					</Tooltip>
				)}
				<div className="value-actions">
					<Button type="text" className="only-btn">
						{onlyButtonLabel}
					</Button>
					<Button type="text" className="toggle-btn">
						Toggle
					</Button>
				</div>
			</div>
		</div>
	);
}

CheckboxValueRow.defaultProps = {
	disabledTooltip: undefined,
	customRendererForValue: undefined,
};

export default CheckboxValueRow;
