import ColorBar from 'lib/uPlotV2/components/ColorBar/ColorBar';
import {
	type ColorRampResolver,
	getRampBottom,
} from 'lib/visualization/colorRamp/colorScale';
import { ColorRampScale } from 'lib/visualization/colorRamp/types';

import SizeLegend from '../SizeLegend/SizeLegend';

import styles from './MapLegend.module.scss';

interface MapLegendSize {
	label: string;
	maxSize: number;
	radiusFor: (size: number) => number;
	formatValue: (value: number) => string;
}

interface MapLegendProps {
	resolver: ColorRampResolver;
	scale: ColorRampScale;
	formatValue: (value: number) => string;
	markerValue: number | null;
	/** Names the colour bar; shown only beside a size legend, where it's ambiguous. */
	valueLabel?: string;
	size?: MapLegendSize;
}

export default function MapLegend({
	resolver,
	scale,
	formatValue,
	markerValue,
	valueLabel,
	size,
}: MapLegendProps): JSX.Element {
	const bottom = getRampBottom(resolver.domain, scale);

	return (
		<div className={styles.legend} data-testid="geo-map-legend">
			{size && valueLabel && (
				<span className={styles.metricLabel}>{valueLabel}</span>
			)}
			<div className={styles.legendBar}>
				<ColorBar
					ramp={resolver.ramp}
					minLabel={formatValue(bottom)}
					maxLabel={formatValue(resolver.domain.max)}
					markerPosition={resolver.positionOf(markerValue)}
				/>
			</div>
			<span className={styles.noDataKey}>
				<span className={styles.noDataSwatch} />
				No data
			</span>
			{size && (
				<SizeLegend
					label={size.label}
					maxSize={size.maxSize}
					radiusFor={size.radiusFor}
					formatValue={size.formatValue}
				/>
			)}
		</div>
	);
}
