import {
	layoutMarkerLabels,
	resolveHoveredMarker,
} from '../drawPercentileMarkers';

describe('resolveHoveredMarker', () => {
	const areas = [
		{
			x: 100,
			badges: [
				{ left: 92, right: 108, top: 0, bottom: 16 },
				{ left: 92, right: 108, top: 184, bottom: 200 },
			],
		},
		{
			x: 120,
			badges: [{ left: 112, right: 128, top: 18, bottom: 34 }],
		},
	];

	it('picks the line nearest x within the tolerance', () => {
		expect(resolveHoveredMarker(areas, 103, 100, 4)).toBe(0);
		expect(resolveHoveredMarker(areas, 117, 100, 4)).toBe(1);
		expect(resolveHoveredMarker(areas, 110, 100, 4)).toBeNull();
	});

	it('picks the marker whose badge is under the cursor', () => {
		expect(resolveHoveredMarker(areas, 107, 190, 4)).toBe(0);
		expect(resolveHoveredMarker(areas, 126, 20, 4)).toBe(1);
	});
});

describe('layoutMarkerLabels', () => {
	it('keeps labels that fit on the first row', () => {
		expect(
			layoutMarkerLabels(
				[
					{ x: 0, width: 20 },
					{ x: 40, width: 20 },
				],
				4,
			),
		).toStrictEqual([0, 0]);
	});

	it('drops a label that would overlap to the next free row', () => {
		expect(
			layoutMarkerLabels(
				[
					{ x: 30, width: 20 },
					{ x: 0, width: 20 },
					{ x: 10, width: 20 },
				],
				4,
			),
		).toStrictEqual([0, 0, 1]);
	});
});
