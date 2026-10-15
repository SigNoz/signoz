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
import { getOutsideView } from '../../geo/classify';
import { useGeoMapShapes } from '../../hooks/useGeoMapShapes';
import {
	GeoMapLayer,
	GeoMapSelection,
	GeoMapView,
	SubdivisionCountry,
} from '../../types';
import { FIXTURES } from '../fixtures/fixtures';
import { FixtureDataset } from '../fixtures/types';
import GeoMapPlaygroundMenu from './GeoMapPlaygroundMenu';
import GeoMapPlaygroundWarnings from './GeoMapPlaygroundWarnings';
import {
	drilldownFieldOf,
	formatterFor,
	prepareFixture,
} from '../fixtures/prepareFixture';
import { statesFixture } from '../fixtures/stateFixtures';
import { useSubdivisionSet } from '../../hooks/useSubdivisionSet';

import styles from './GeoMapPlayground.module.scss';

export interface GeoMapPlaygroundProps {
	dataset: FixtureDataset;
	/** Any country's states with generated values; overrides `dataset`. */
	statesOf: SubdivisionCountry | 'none';
	view: GeoMapView;
	layer: GeoMapLayer;
	showLabels: boolean;
	legendPosition: LegendPosition;
	mode: ColorRampMode;
	/** Opacity mode's colour; empty uses the default fill. */
	fill: string;
	palette: ColorRampPalette;
	scale: ColorRampScale;
	steps: number;
	minRadius: number;
	maxRadius: number;
	width: number;
	height: number;
}

export default function GeoMapPlayground({
	dataset,
	statesOf,
	view,
	layer,
	showLabels,
	legendPosition,
	mode,
	fill,
	palette,
	scale,
	steps,
	minRadius,
	maxRadius,
	width,
	height,
}: GeoMapPlaygroundProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const country = statesOf === 'none' ? FIXTURES[dataset].country : statesOf;
	const { set: subdivisions } = useSubdivisionSet(country);
	const fixture = useMemo(
		() =>
			statesOf === 'none'
				? FIXTURES[dataset]
				: statesFixture(statesOf, subdivisions),
		[dataset, statesOf, subdivisions],
	);
	// State datasets are always drawn on their country's view.
	const mapView: GeoMapView = fixture.country ? 'country' : view;
	const { shapes } = useGeoMapShapes(mapView, fixture.country);
	const prepared = useMemo(
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
		() => ({ mode, fill, palette, scale, steps, min: null, max: null }),
		[mode, fill, palette, scale, steps],
	);
	const bubbleRadius = useMemo<[number, number]>(
		() => [minRadius, maxRadius],
		[minRadius, maxRadius],
	);
	const outside = useMemo(
		() =>
			shapes ? getOutsideView(prepared.data, shapes.byCode, shapes.isMember) : [],
		[prepared.data, shapes],
	);
	const [selection, setSelection] = useState<GeoMapSelection | null>(null);
	const closeMenu = useCallback((): void => setSelection(null), []);
	const renderTooltipFooter = useCallback(
		() => (
			<TooltipFooter
				id="geo-map-playground"
				isPinned={false}
				canPin={false}
				dismiss={closeMenu}
			/>
		),
		[closeMenu],
	);

	return (
		<div className={styles.page}>
			<div
				className={styles.panel}
				style={{ width, height }}
				data-testid="geo-map-playground-panel"
			>
				<div className={styles.header}>
					<span className={styles.title}>{fixture.title}</span>
					<GeoMapPlaygroundWarnings
						unmapped={prepared.unmapped}
						duplicates={prepared.duplicates}
						outside={outside}
					/>
				</div>
				<div className={styles.body}>
					<GeoMap
						data={prepared.data}
						view={mapView}
						country={fixture.country}
						layer={fixture.points ? 'points' : layer}
						points={fixture.points}
						showLabels={showLabels}
						legendPosition={legendPosition}
						colors={colors}
						bubbleRadius={bubbleRadius}
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
				<GeoMapPlaygroundMenu
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
