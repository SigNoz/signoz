import './LabelColumn.styles.scss';

import { Popover, Tag, Tooltip } from 'antd';
import { popupContainer } from 'utils/selectPopupContainer';

import { LabelColumnProps } from './TableRenderer.types';
import { getLabelRenderingValue } from './utils';

function LabelColumn({ labels, value, color }: LabelColumnProps): JSX.Element {
	const newLabels = labels.length > 3 ? labels.slice(0, 3) : labels;
	const remainingLabels = labels.length > 3 ? labels.slice(3) : [];

	return (
		<div className="LabelColumn">
			{newLabels.map(
				(label: string): JSX.Element => {
					const tooltipTitle =
						value && value[label] ? `${label}: ${value[label]}` : label;
					return (
						<Tooltip title={tooltipTitle} key={label}>
							<Tag className="LabelColumn-label-tag" color={color}>
								{getLabelRenderingValue(label, value && value[label])}
							</Tag>
						</Tooltip>
					);
				},
			)}
			{remainingLabels.length > 0 && (
				<Popover
					getPopupContainer={popupContainer}
					placement="bottomRight"
					showArrow={false}
					content={
						<div>
							{labels.map(
								(label: string): JSX.Element => {
									const tooltipTitle =
										value && value[label] ? `${label}: ${value[label]}` : label;
									return (
										<div className="labelColumn-popover" key={label}>
											<Tooltip title={tooltipTitle}>
												<Tag className="LabelColumn-label-tag" color={color}>
													{getLabelRenderingValue(label, value && value[label])}
												</Tag>
											</Tooltip>
										</div>
									);
								},
							)}
						</div>
					}
					trigger="hover"
				>
					<Tag className="LabelColumn-label-tag" color={color}>
						+{remainingLabels.length}
					</Tag>
				</Popover>
			)}
		</div>
	);
}

LabelColumn.defaultProps = {
	value: {},
};

export default LabelColumn;
