import { useCallback, useMemo, useState } from 'react';
import { useIsDarkMode } from 'hooks/useDarkMode';
import TooltipFooter from 'lib/visualization/panels/components/TooltipFooter';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import {
	ColorRampMode,
	ColorRampPalette,
	ColorRampScale,
} from 'lib/visualization/colorRamp/types';

import GeoMap from '../../GeoMap';
import { useGeoMapShapes } from '../../hooks/useGeoMapShapes';
import { useSubdivisionSet } from '../../hooks/useSubdivisionSet';
import { GeoMapLayer, GeoMapSelection, GeoMapView } from '../../types';
import { FIXTURES } from '../fixtures/fixtures';
import {
	drilldownFieldOf,
	formatterFor,
	prepareFixture,
} from '../fixtures/prepareFixture';
import { FixtureDataset } from '../fixtures/types';
import GeoMapStoryMenu from './GeoMapStoryMenu';

import styles from './GeoMapStory.module.scss';

const BUBBLE_RADIUS: [number, number] = [3, 28];

export interface GeoMapStoryProps {
	dataset: FixtureDataset;
	view: GeoMapView;
	layer: GeoMapLayer;
	palette: ColorRampPalette;
}

export default function GeoMapStory({
	dataset,
	view,
	layer,
	palette,
}: GeoMapStoryProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const fixture = FIXTURES[dataset];
	const { set: subdivisions } = useSubdivisionSet(fixture.country);
	// State datasets are always drawn on their country's view.
	const mapView: GeoMapView = fixture.country ? 'country' : view;
	const { shapes } = useGeoMapShapes(mapView, fixture.country);
	const data = useMemo(
		() => prepareFixture(fixture, subdivisions),
		[fixture, subdivisions],
	);
	const formatValue = useMemo(() => formatterFor(fixture.unit), [fixture.unit]);
	const sizeMetric = useMemo(
		() =>
			fixture.sizeMetric && {
				label: fixture.sizeMetric.label,
				formatValue: formatterFor(fixture.sizeMetric.unit),
			},
		[fixture.sizeMetric],
	);
	const colors = useMemo(
		() => ({
			mode: ColorRampMode.Palette,
			fill: '',
			palette,
			scale: ColorRampScale.Log,
			steps: 64,
			min: null,
			max: null,
		}),
		[palette],
	);
	const [selection, setSelection] = useState<GeoMapSelection | null>(null);
	const closeMenu = useCallback((): void => setSelection(null), []);
	const renderTooltipFooter = useCallback(
		() => (
			<TooltipFooter
				id="geo-map-story"
				isPinned={false}
				canPin={false}
				dismiss={closeMenu}
			/>
		),
		[closeMenu],
	);

	return (
		<div className={styles.page}>
			<div className={styles.panel} style={{ width: 960, height: 540 }}>
				<div className={styles.header}>
					<span className={styles.title}>{fixture.title}</span>
				</div>
				<div className={styles.body}>
					<GeoMap
						data={data}
						view={mapView}
						projection="mercator"
						country={fixture.country}
						layer={fixture.points ? 'points' : layer}
						points={fixture.points}
						showLabels
						legendPosition={LegendPosition.BOTTOM}
						colors={colors}
						bubbleRadius={BUBBLE_RADIUS}
						formatValue={formatValue}
						valueLabel={fixture.valueLabel}
						sizeMetric={sizeMetric}
						isDarkMode={isDarkMode}
						onSelect={setSelection}
						renderTooltipFooter={renderTooltipFooter}
					/>
				</div>
			</div>
			{selection && (
				<GeoMapStoryMenu
					selection={selection}
					name={
						selection.point?.label ??
						shapes?.nameOf(selection.datum.code) ??
						selection.datum.code
					}
					field={drilldownFieldOf(selection, fixture.country)}
					formatValue={formatValue}
					onClose={closeMenu}
				/>
			)}
		</div>
	);
}
