import ColorBar from 'lib/uPlotV2/components/ColorBar/ColorBar';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import {
	type ColorRampResolver,
	getRampBottom,
} from 'lib/visualization/colorRamp/colorScale';
import { ColorRampScale } from 'lib/visualization/colorRamp/types';

import type { GeoMapColorKey } from '../../types';
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
	/** Names the column the colour bar shows. */
	valueLabel?: string;
	colorKeys?: GeoMapColorKey[];
	position?: LegendPosition;
	size?: MapLegendSize;
}

export default function MapLegend({
	resolver,
	scale,
	formatValue,
	markerValue,
	valueLabel,
	colorKeys = [],
	position = LegendPosition.BOTTOM,
	size,
}: MapLegendProps): JSX.Element {
	const bottom = getRampBottom(resolver.domain, scale);
	const isRight = position === LegendPosition.RIGHT;

	return (
		<div
			className={styles.legend}
			data-position={position}
			data-testid="geo-map-legend"
		>
			<div className={styles.colorGroup}>
				{valueLabel && <span className={styles.metricLabel}>{valueLabel}</span>}
				<div className={styles.legendBar}>
					<ColorBar
						ramp={resolver.ramp}
						minLabel={formatValue(bottom)}
						maxLabel={formatValue(resolver.domain.max)}
						markerPosition={resolver.positionOf(markerValue)}
						orientation={isRight ? 'vertical' : 'horizontal'}
					/>
				</div>
			</div>
			<div className={styles.keys}>
				<span className={styles.key}>
					<span className={styles.noDataSwatch} />
					No data
				</span>
				{colorKeys.map((key) => (
					<span
						key={`${key.label}-${key.color}`}
						className={styles.key}
						data-testid="geo-map-color-key"
					>
						<span className={styles.swatch} style={{ background: key.color }} />
						{key.label}
					</span>
				))}
			</div>
			{size && (
				<SizeLegend
					label={size.label}
					maxSize={size.maxSize}
					radiusFor={size.radiusFor}
					formatValue={size.formatValue}
					stacked={isRight}
				/>
			)}
		</div>
	);
}
