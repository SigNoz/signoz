import { Tooltip } from 'antd';
import { Badge } from '@signozhq/ui/badge';

import { getLabelRenderingValue } from './utils';

function TagWithToolTip({ label, value }: TagWithToolTipProps): JSX.Element {
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

type TagWithToolTipProps = {
	label: string;
	value?: {
		[key: string]: string;
	};
};

TagWithToolTip.defaultProps = {
	value: undefined,
};

export default TagWithToolTip;
