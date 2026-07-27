import type { DashboardtypesDashboardSpecDTOPanels } from 'api/generated/services/sigNoz.schemas';

import { getPanelIdsReferencingVariable } from '../utils/applyVariableToPanelsPatch';

/** Minimal builder-query panel wrapped in a CompositeQuery, with a given filter. */
function compositePanel(filterExpression: string): unknown {
	return {
		kind: 'panel',
		spec: {
			display: { title: '' },
			plugin: { kind: 'signoz/TimeSeries', spec: {} },
			queries: [
				{
					kind: 'builder_query',
					spec: {
						plugin: {
							kind: 'signoz/CompositeQuery',
							spec: {
								queries: [
									{
										type: 'builder_query',
										spec: {
											name: 'A',
											signal: 'logs',
											filter: { expression: filterExpression },
										},
									},
								],
							},
						},
					},
				},
			],
		},
	};
}

/** A bare LIST-style BuilderQuery panel (filter lives directly on the plugin spec). */
function listPanel(filterExpression: string): unknown {
	return {
		kind: 'panel',
		spec: {
			display: { title: '' },
			plugin: { kind: 'signoz/List', spec: {} },
			queries: [
				{
					kind: 'builder_query',
					spec: {
						plugin: {
							kind: 'signoz/BuilderQuery',
							spec: {
								name: 'A',
								signal: 'logs',
								filter: { expression: filterExpression },
							},
						},
					},
				},
			],
		},
	};
}

function panels(
	map: Record<string, unknown>,
): DashboardtypesDashboardSpecDTOPanels {
	return map as DashboardtypesDashboardSpecDTOPanels;
}

describe('getPanelIdsReferencingVariable', () => {
	it('returns only panels whose filter references the variable', () => {
		const ids = getPanelIdsReferencingVariable(
			panels({
				p1: compositePanel('service.name IN $svc'),
				p2: compositePanel('env = "prod"'),
				p3: listPanel('service.name IN $svc'),
			}),
			'service.name',
			'svc',
		);
		expect(ids.sort()).toStrictEqual(['p1', 'p3']);
	});
});
