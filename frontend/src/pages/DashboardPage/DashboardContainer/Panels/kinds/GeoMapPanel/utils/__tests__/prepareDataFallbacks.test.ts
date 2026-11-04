import {
	countryTable,
	group,
	locationOf,
	makeTable,
	mapOf,
	prepare,
	value,
} from './prepareGeoMapFixtures';

describe('prepareGeoMapData fallbacks', () => {
	it('falls back to the first group column when nothing is recognised', () => {
		const data = prepare(
			makeTable([group('client'), value('A')], [{ client: 'JP', A: 1 }]),
		);

		expect(data.regions).toStrictEqual([{ code: 'JP', value: 1, raw: 'JP' }]);
	});

	it('has no location without a group by', () => {
		const data = prepare(makeTable([value('A')], [{ A: 1 }]));

		expect(data.location).toBeNull();
		expect(data.regions).toStrictEqual([]);
	});

	it('names spec columns missing from the result and falls back', () => {
		const data = prepare(countryTable, {
			location: locationOf({ country: 'client.country' }),
			map: mapOf({ colorBy: 'F1', sizeBy: 'B' }),
		});

		expect(data.staleBindings).toStrictEqual([
			{ field: 'country', key: 'client.country' },
			{ field: 'colorBy', key: 'F1' },
		]);
		expect(data.colorColumn?.id).toBe('A');
		expect(data.regions).toHaveLength(3);
	});
});
