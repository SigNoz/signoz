import { initialQueriesMap } from 'constants/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { decodeQsAlias, encodeQsAlias, qsAliasAdapter } from '../index';

const STABLE_ID = 'test-stable-id';

const normalizeId = (query: Query): Query => ({ ...query, id: STABLE_ID });

const normalizeUrl = (url: string): string =>
	url.replace(/id=[^&]+/, `id=${STABLE_ID}`);

const tagOf = (params: URLSearchParams): string => params.get('_t') ?? '';

describe('qsAliasAdapter tagging', () => {
	describe('encode tags by dataSource', () => {
		it('metrics → QAm', () => {
			const encoded = qsAliasAdapter.encode(initialQueriesMap.metrics);
			expect(tagOf(encoded)).toBe('QAm');
			expect(encodeQsAlias(initialQueriesMap.metrics).tag).toBe('QAm');
			expect(normalizeUrl(encoded.toString())).toMatchSnapshot('url');
		});

		it('logs → QAl', () => {
			const encoded = qsAliasAdapter.encode(initialQueriesMap.logs);
			expect(tagOf(encoded)).toBe('QAl');
			expect(encodeQsAlias(initialQueriesMap.logs).tag).toBe('QAl');
			expect(normalizeUrl(encoded.toString())).toMatchSnapshot('url');
		});

		it('traces → QAt', () => {
			const encoded = qsAliasAdapter.encode(initialQueriesMap.traces);
			expect(tagOf(encoded)).toBe('QAt');
			expect(encodeQsAlias(initialQueriesMap.traces).tag).toBe('QAt');
			expect(normalizeUrl(encoded.toString())).toMatchSnapshot('url');
		});
	});

	describe('matches', () => {
		it('matches its own QAm/QAl/QAt tags', () => {
			expect(
				qsAliasAdapter.matches(qsAliasAdapter.encode(initialQueriesMap.metrics)),
			).toBe(true);
			expect(
				qsAliasAdapter.matches(qsAliasAdapter.encode(initialQueriesMap.logs)),
			).toBe(true);
			expect(
				qsAliasAdapter.matches(qsAliasAdapter.encode(initialQueriesMap.traces)),
			).toBe(true);
		});

		it('rejects another serializer tag', () => {
			const params = new URLSearchParams();
			params.set('_t', 'FVm~');
			expect(qsAliasAdapter.matches(params)).toBe(false);
		});

		it('rejects the legacy compositeQuery param', () => {
			const params = new URLSearchParams();
			params.set('compositeQuery', '{"queryType":"builder"}');
			expect(qsAliasAdapter.matches(params)).toBe(false);
		});

		it('rejects empty params', () => {
			expect(qsAliasAdapter.matches(new URLSearchParams())).toBe(false);
		});
	});

	describe('tag-only decode returns the baseline', () => {
		it.each([
			['QAm', 'metrics'],
			['QAl', 'logs'],
			['QAt', 'traces'],
		] as const)('%s decodes to the %s baseline', (tag, dataSource) => {
			const params = new URLSearchParams();
			params.set('_t', tag);
			const decoded = decodeQsAlias(params);
			expect(decoded.queryType).toBe('builder');
			expect(decoded.builder.queryData[0].dataSource).toBe(dataSource);
			expect(normalizeId(decoded)).toMatchSnapshot(`decoded-${tag}`);
		});

		it('round-trips the baseline with no extra params', () => {
			const { params, tag } = encodeQsAlias(initialQueriesMap.logs);
			expect(tag).toBe('QAl');
			expect(normalizeUrl(params.toString())).toMatchSnapshot('url');
			const decoded = decodeQsAlias(params);
			expect(decoded).toStrictEqual(initialQueriesMap.logs);
			expect(normalizeId(decoded)).toMatchSnapshot('decoded');
		});
	});
});
