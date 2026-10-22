import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import { buildVariableImpactPatch } from '../utils/variableImpactPatch';
import type { VariableUsage } from '../utils/variableUsages';

jest.mock('../variableAdapters', () => ({
	formModelToDto: (model: unknown): unknown => model,
}));

const dashboard = {
	spec: {
		panels: {
			runbook: {
				spec: {
					display: { name: 'Runbook' },
					plugin: { kind: 'signoz/TextPanel', spec: { text: 'env {{svc}}' } },
					queries: [],
				},
			},
		},
		variables: [],
	},
} as unknown as DashboardtypesGettableDashboardV2DTO;

const textUsage: VariableUsage = {
	id: 'panel:runbook:0',
	sourceType: 'panel',
	sourceId: 'runbook',
	sourceLabel: 'Runbook',
	kind: 'text',
	envelopeIndex: 0,
	currentText: 'env {{svc}}',
	resultingText: 'env {{zone}}',
};

describe('buildVariableImpactPatch — text panel bodies', () => {
	it('replaces the plugin-spec text, never the (empty) queries', () => {
		const ops = buildVariableImpactPatch(dashboard, [], [textUsage]);

		const panelOps = ops.filter((op) => op.path.includes('/panels/'));
		expect(panelOps).toStrictEqual([
			{
				op: 'replace',
				path: '/spec/panels/runbook/spec/plugin/spec/text',
				value: 'env {{zone}}',
			},
		]);
	});
});
