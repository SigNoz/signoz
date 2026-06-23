import type { DashboardtypesVariableDTO } from 'api/generated/services/sigNoz.schemas';

import { dtoToFormModel, formModelToDto } from './variableAdapters';
import { emptyVariableFormModel } from './variableModel';

describe('variableAdapters', () => {
	it('maps dynamic variable capturingRegexp from DTO to form model', () => {
		const dto = {
			kind: 'ListVariable',
			spec: {
				name: 'pod',
				display: { name: 'pod' },
				allowAllValue: false,
				allowMultiple: false,
				sort: 'DISABLED',
				capturingRegexp: '^api-.*',
				plugin: {
					kind: 'signoz/DynamicVariable',
					spec: {
						name: 'k8s.pod.name',
						signal: 'metrics',
					},
				},
			},
		} as DashboardtypesVariableDTO;

		expect(dtoToFormModel(dto).capturingRegexp).toBe('^api-.*');
	});

	it('maps dynamic variable capturingRegexp from form model to DTO', () => {
		const dto = formModelToDto({
			...emptyVariableFormModel(),
			name: 'pod',
			type: 'DYNAMIC',
			dynamicAttribute: 'k8s.pod.name',
			dynamicSignal: 'metrics',
			capturingRegexp: '^api-.*',
		});

		expect((dto.spec as { capturingRegexp?: string }).capturingRegexp).toBe(
			'^api-.*',
		);
	});
});
