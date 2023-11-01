import { Tag, Tooltip } from 'antd';

import { getLabelRenderingValue } from './utils';

function TagWithToolTip({
	label,
	value,
	color,
}: TagWithToolTipProps): JSX.Element {
	const tooltipTitle =
		value && value[label] ? `${label}: ${value[label]}` : label;
	return (
		<div key={label}>
			<Tooltip title={tooltipTitle}>
				<Tag className="label-column--tag" color={color}>
					{getLabelRenderingValue(label, value && value[label])}
				</Tag>
			</Tooltip>
		</div>
	);
}

type TagWithToolTipProps = {
	label: string;
	color?: string;
	value?: {
		[key: string]: string;
	};
};

TagWithToolTip.defaultProps = {
	value: undefined,
	color: undefined,
};

export default TagWithToolTip;
