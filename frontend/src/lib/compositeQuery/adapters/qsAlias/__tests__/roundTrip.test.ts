import { isEqual } from 'lodash-es';

import { initialQueriesMap } from 'constants/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { roundTripScenarios } from '../../testing/scenarios';
import { qsAliasAdapter } from '../index';

const STABLE_ID = 'test-stable-id';

const normalizeId = (query: Query): Query => ({ ...query, id: STABLE_ID });

const normalizeUrl = (url: string): string =>
	url.replace(/id=[^&]+/, `id=${STABLE_ID}`);

const roundTrip = (query: Query): Query =>
	qsAliasAdapter.decode(qsAliasAdapter.encode(query));

describe('qsAliasAdapter round-trip', () => {
	describe('scenarios', () => {
		it.each(roundTripScenarios)(
			'$name survives encode → decode',
			({ query, name }) => {
				const wire = qsAliasAdapter.encode(query).toString();
				expect(normalizeUrl(wire)).toMatchSnapshot(`${name}-url`);
				const decoded = roundTrip(query);
				expect(decoded).toStrictEqual(query);
				expect(normalizeId(decoded)).toMatchSnapshot(`${name}-decoded`);
			},
		);
	});

	it('decoded query keeps exactly the source top-level keys', () => {
		const wire = qsAliasAdapter.encode(initialQueriesMap.metrics).toString();
		expect(normalizeUrl(wire)).toMatchSnapshot('url');
		const decoded = roundTrip(initialQueriesMap.metrics);
		expect(Object.keys(decoded).sort()).toStrictEqual(
			Object.keys(initialQueriesMap.metrics).sort(),
		);
		expect(normalizeId(decoded)).toMatchSnapshot('decoded');
	});

	it('is lodash isEqual to the source (ignoring volatile id)', () => {
		const wire = qsAliasAdapter.encode(initialQueriesMap.metrics).toString();
		expect(normalizeUrl(wire)).toMatchSnapshot('url');
		const decoded = roundTrip(initialQueriesMap.metrics);
		const { id: _sourceId, ...source } = initialQueriesMap.metrics;
		const { id: _decodedId, ...result } = decoded;
		expect(isEqual(source, result)).toBe(true);
		expect(normalizeId(decoded)).toMatchSnapshot('decoded');
	});
});
