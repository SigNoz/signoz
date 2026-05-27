import { Tooltip } from 'antd';
import { Badge } from '@signozhq/ui/badge';

import { getLabelRenderingValue } from './utils';

function BadgeWithTooltip({
	label,
	value,
}: BadgeWithTooltipProps): JSX.Element {
	const tooltipTitle =
		value && value[label] ? `${label}: ${value[label]}` : label;
	return (
		<div key={label}>
			<Tooltip title={tooltipTitle}>
				<Badge className="label-column--tag" color="vanilla">
					{getLabelRenderingValue(label, value && value[label])}
				</Badge>
			</Tooltip>
		</div>
	);
}

type BadgeWithTooltipProps = {
	label: string;
	value?: {
		[key: string]: string;
	};
};

BadgeWithTooltip.defaultProps = {
	value: undefined,
};

export default BadgeWithTooltip;
