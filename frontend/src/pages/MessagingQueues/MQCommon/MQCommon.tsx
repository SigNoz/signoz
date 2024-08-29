/* eslint-disable react/destructuring-assignment */
import './MQCommon.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Tooltip } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { Info } from 'lucide-react';

export function ComingSoon(): JSX.Element {
	return (
		<Tooltip
			title="Contact us at cloud-support@signoz.io for more details."
			placement="top"
			overlayClassName="tooltip-overlay"
		>
			<div className="coming-soon">
				<div className="coming-soon__text">Coming Soon</div>
				<div className="coming-soon__icon">
					<Info size={10} color={Color.BG_SIENNA_400} />
				</div>
			</div>
		</Tooltip>
	);
}

export function SelectMaxTagPlaceholder(
	omittedValues: Partial<DefaultOptionType>[],
): JSX.Element {
	return (
		<Tooltip title={omittedValues.map(({ value }) => value).join(', ')}>
			<span>+ {omittedValues.length} </span>
		</Tooltip>
	);
}

export function SelectLabelWithComingSoon({
	label,
}: {
	label: string;
}): JSX.Element {
	return (
		<div className="select-label-with-coming-soon">
			{label} <ComingSoon />
		</div>
	);
}
