import { memo } from 'react';
import { Tooltip } from 'antd';

import { TabLabelProps } from './TabLabel.interfaces';

function TabLabel({
	label,
	isDisabled,
	tooltipText,
}: TabLabelProps): JSX.Element {
	const currentLabel = <span data-testid={`${label}`}>{label}</span>;

	if (isDisabled) {
		return (
			<Tooltip
				trigger="hover"
				autoAdjustOverflow
				placement="top"
				title={tooltipText}
			>
				{currentLabel}
			</Tooltip>
		);
	}

	return currentLabel;
}

export default memo(TabLabel);
