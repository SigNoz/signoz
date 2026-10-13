import ColorBar from 'lib/uPlotV2/components/ColorBar/ColorBar';
import {
	type ColorRampResolver,
	getRampBottom,
} from 'lib/visualization/colorRamp/colorScale';
import { ColorRampScale } from 'lib/visualization/colorRamp/types';

import styles from './MapLegend.module.scss';

interface MapLegendProps {
	resolver: ColorRampResolver;
	scale: ColorRampScale;
	formatValue: (value: number) => string;
	markerValue: number | null;
}

export default function MapLegend({
	resolver,
	scale,
	formatValue,
	markerValue,
}: MapLegendProps): JSX.Element {
	const bottom = getRampBottom(resolver.domain, scale);

	return (
		<div className={styles.legend} data-testid="geo-map-legend">
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
		</div>
	);
}
