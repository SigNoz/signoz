import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	routeKey,
	routePath,
	routeSpec,
	substitute,
	toCamel,
	toConst,
	toDirName,
	toKebab,
	toTitle,
	tokensFor,
} from './lib.mjs';

describe('names', () => {
	it('keeps typed casing and forces the first letter up', () => {
		assert.equal(toDirName('LLMObservability'), 'LLMObservability');
		assert.equal(toDirName('apiMonitoring'), 'ApiMonitoring');
	});

	it('collapses separated names to PascalCase', () => {
		assert.equal(toDirName('api-monitoring'), 'ApiMonitoring');
		assert.equal(toDirName('api monitoring'), 'ApiMonitoring');
		assert.equal(toDirName('saved_views'), 'SavedViews');
	});

	it('derives kebab, title, const and camel forms, splitting acronyms', () => {
		assert.deepEqual(tokensFor('LLMObservability'), {
			__Pascal__: 'LLMObservability',
			__kebab__: 'llm-observability',
			__camel__: 'lLMObservability',
			__CONST__: 'LLM_OBSERVABILITY',
			__Title__: 'LLM Observability',
		});
		assert.equal(toKebab('SavedViews'), 'saved-views');
		assert.equal(toTitle('SavedViews'), 'Saved Views');
		assert.equal(toConst('SavedViews'), 'SAVED_VIEWS');
		assert.equal(toCamel('SavedViews'), 'savedViews');
	});

	it('rejects names with no usable characters', () => {
		assert.throws(() => toDirName('***'), /no usable name characters/);
	});
});

describe('substitute', () => {
	it('replaces every occurrence of every token, in file names and contents', () => {
		const tokens = tokensFor('ApiMonitoring');
		assert.equal(substitute('__Pascal__.module.scss', tokens), 'ApiMonitoring.module.scss');
		assert.equal(
			substitute('__kebab__-page / __kebab__-shell / __Title__', tokens),
			'api-monitoring-page / api-monitoring-shell / Api Monitoring',
		);
	});
});

describe('routes', () => {
	it('builds keys and paths from every segment plus the view', () => {
		assert.equal(routeKey(['Traces'], 'SavedViews'), 'TRACES_SAVED_VIEWS');
		assert.equal(routePath(['Traces'], 'SavedViews'), '/traces/saved-views');
		assert.equal(routeKey(['Traces', 'Explorer']), 'TRACES_EXPLORER');
		assert.equal(routePath(['Traces', 'Explorer']), '/traces/explorer');
	});

	it('routes a leaf page under a single key', () => {
		assert.deepEqual(routeSpec(['ApiMonitoring'], []), {
			component: {
				name: 'ApiMonitoringPage',
				importPath: 'pages/ApiMonitoring',
				chunk: 'Api Monitoring Page',
			},
			keys: [{ key: 'API_MONITORING', path: '/api-monitoring' }],
			routed: ['API_MONITORING'],
		});
	});

	it('routes a shell under a base key plus one key per view, all to the shell', () => {
		const spec = routeSpec(['Traces'], ['Explorer', 'Funnels']);
		assert.equal(spec.component.name, 'TracesPage');
		assert.deepEqual(spec.keys, [
			{ key: 'TRACES_BASE', path: '/traces' },
			{ key: 'TRACES_EXPLORER', path: '/traces/explorer' },
			{ key: 'TRACES_FUNNELS', path: '/traces/funnels' },
		]);
		assert.deepEqual(spec.routed, ['TRACES_BASE', 'TRACES_EXPLORER', 'TRACES_FUNNELS']);
	});

	it('points a view added under an existing shell at the shell component', () => {
		const spec = routeSpec(['Traces', 'Explorer'], []);
		assert.equal(spec.component.importPath, 'pages/Traces');
		assert.deepEqual(spec.keys, [{ key: 'TRACES_EXPLORER', path: '/traces/explorer' }]);
	});
});
