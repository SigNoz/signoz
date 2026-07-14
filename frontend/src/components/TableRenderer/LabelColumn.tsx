import { Popover } from 'antd';
import { Badge } from '@signozhq/ui/badge';

import { LabelColumnProps } from './TableRenderer.types';
import BadgeWithTooltip from './BadgeWithTooltip';
import { getLabelAndValueContent } from './utils';

import './LabelColumn.styles.scss';

function LabelColumn({ labels, value }: LabelColumnProps): JSX.Element {
	const newLabels = labels.length > 3 ? labels.slice(0, 3) : labels;
	const remainingLabels = labels.length > 3 ? labels.slice(3) : [];

	return (
		<div className="label-column">
			{newLabels.map(
				(label: string): JSX.Element => (
					<BadgeWithTooltip key={label} label={label} value={value} />
				),
			)}
			{remainingLabels.length > 0 && (
				<Popover
					placement="bottomRight"
					showArrow={false}
					content={
						<div>
							{labels.map(
								(label: string): JSX.Element => (
									<div key={label}>
										<Badge className="label-column--tag" color="vanilla">
											{getLabelAndValueContent(label, value && value[label])}
										</Badge>
									</div>
								),
							)}
						</div>
					}
					trigger="hover"
				>
					<Badge className="label-column--tag" color="vanilla">
						+{remainingLabels.length}
					</Badge>
				</Popover>
			)}
		</div>
	);
}

LabelColumn.defaultProps = {
	value: {},
};

export default LabelColumn;
