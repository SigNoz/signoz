import { GeoMapDatum, ShapeFeature } from '../../types';
import { getOutsideView } from '../classify';
import { getCountryShapes, getSubdivisionShapes } from '../shapes';
import {
	isSubdivisionCountry,
	loadSubdivisions,
	SUBDIVISION_COUNTRIES,
	SubdivisionSet,
} from '../subdivisions';

const datum = (code: string): GeoMapDatum => ({ code, value: 1, raw: code });

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
