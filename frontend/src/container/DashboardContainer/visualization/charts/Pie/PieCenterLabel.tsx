import type { PrecisionOption } from 'components/Graph/types';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';

import { getScaledFontSize } from './utils';

interface PieCenterLabelProps {
	/** Sum of the visible slice values, shown in the donut hole. */
	total: number;
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
	radius: number;
	innerRadius: number;
	color: string;
}

/**
 * The total shown in the centre of the donut. Splits the formatted value into
 * its numeric part and unit so each can be sized independently, and scales the
 * numeric font down for long values so it never overflows the hole.
 */
export default function PieCenterLabel({
	total,
	yAxisUnit,
	decimalPrecision,
	radius,
	innerRadius,
	color,
}: PieCenterLabelProps): JSX.Element {
	const formattedTotal = getYAxisFormattedValue(
		total.toString(),
		yAxisUnit || 'none',
		decimalPrecision,
	);
	const matches = formattedTotal.match(/([\d.]+[KMB]?)(.*)$/);
	const numericTotal = matches?.[1] || formattedTotal;
	const unitTotal = matches?.[2]?.trim() || '';

	const numericFontSize = getScaledFontSize({
		text: numericTotal,
		baseSize: radius * 0.3,
		innerRadius,
	});
	const unitFontSize = numericFontSize * 0.5;

	return (
		<text textAnchor="middle" dominantBaseline="central" fill={color}>
			<tspan fontSize={numericFontSize} fontWeight="bold">
				{numericTotal}
			</tspan>
			{unitTotal && (
				<tspan fontSize={unitFontSize} opacity={0.9} dx={2}>
					{unitTotal}
				</tspan>
			)}
		</text>
	);
}
