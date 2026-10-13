import type { ParsedFeature } from '@visx/geo/lib/projections/Projection';

import { GeoMapDatum, ShapeFeature } from '../../types';
import { classifyFeatures, getOutsideView } from '../classify';
import { getCountryShapes, getSubdivisionShapes } from '../shapes';
import {
	isSubdivisionCountry,
	loadSubdivisions,
	SUBDIVISION_COUNTRIES,
	SubdivisionSet,
} from '../subdivisions';

const datum = (code: string): GeoMapDatum => ({ code, value: 1, raw: code });

function parsed(
	code: string,
	path: string | null,
): ParsedFeature<ShapeFeature> {
	return {
		feature: {
			type: 'Feature',
			properties: { code, name: code, label: [0, 0] },
			geometry: { type: 'Polygon', coordinates: [] },
		},
		path,
	} as unknown as ParsedFeature<ShapeFeature>;
}

describe('classifyFeatures', () => {
	const inside: [[number, number], [number, number]] = [
		[10, 10],
		[20, 20],
	];
	const outside: [[number, number], [number, number]] = [
		[500, 500],
		[600, 600],
	];
	const boundsByCode: Record<string, typeof inside> = {
		NEAR: inside,
		FAR: outside,
	};
	const path = {
		bounds: (shape: ShapeFeature): typeof inside =>
			boundsByCode[shape.properties.code as string] ?? inside,
	};
	const isMember = (shape: ShapeFeature): boolean =>
		shape.properties.code === 'IN_VIEW';

	it('splits members from the non-members that land in the panel', () => {
		const { members, context } = classifyFeatures(
			[parsed('IN_VIEW', 'M0'), parsed('NEAR', 'M0'), parsed('FAR', 'M0')],
			path,
			isMember,
			100,
			100,
		);
		expect(members.map((m) => m.feature.properties.code)).toStrictEqual([
			'IN_VIEW',
		]);
		expect(context.map((c) => c.feature.properties.code)).toStrictEqual(['NEAR']);
	});

	it('drops shapes the projection clipped away entirely', () => {
		const { members } = classifyFeatures(
			[parsed('IN_VIEW', null)],
			path,
			isMember,
			100,
			100,
		);
		expect(members).toHaveLength(0);
	});
});

describe('country shapes', () => {
	it('reports values outside a region view', () => {
		const shapes = getCountryShapes('europe');
		const outside = getOutsideView(
			[datum('DE'), datum('US'), datum('ZZ')],
			shapes.byCode,
			shapes.isMember,
		);
		expect(outside.map((d) => d.code)).toStrictEqual(['US', 'ZZ']);
	});

	it('names countries in English', () => {
		expect(getCountryShapes('world').nameOf('DE')).toBe('Germany');
	});
});

describe('subdivision shapes', () => {
	let india: SubdivisionSet;

	beforeAll(async () => {
		india = await loadSubdivisions('IN');
	});

	it('draws the states as members and other countries as context', () => {
		const shapes = getSubdivisionShapes(india);
		const codes = shapes.shapes.map((shape) => shape.properties.code);

		expect(codes).not.toContain('IN');
		expect(codes).toContain('PK');
		expect(shapes.isMember(shapes.byCode.get('IN-MH') as ShapeFeature)).toBe(
			true,
		);
	});

	it('reports country-level values as outside the state view', () => {
		const shapes = getSubdivisionShapes(india);
		const outside = getOutsideView(
			[datum('IN-KA'), datum('US-CA'), datum('IN')],
			shapes.byCode,
			shapes.isMember,
		);
		expect(outside.map((d) => d.code)).toStrictEqual(['US-CA', 'IN']);
	});

	it('names states from the outlines file', () => {
		expect(getSubdivisionShapes(india).nameOf('IN-MH')).toBe('Maharashtra');
	});
});

describe('isSubdivisionCountry', () => {
	it.each(SUBDIVISION_COUNTRIES)(
		'accepts %s, which ships its states',
		(code) => {
			expect(isSubdivisionCountry(code)).toBe(true);
		},
	);

	it.each([['BR'], ['us'], [''], [null], [undefined], ['toString']])(
		'rejects %p',
		(code) => {
			expect(isSubdivisionCountry(code)).toBe(false);
		},
	);
});
