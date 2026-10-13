import {
	emptyVariableFormModel,
	type VariableFormModel,
} from '../variableFormModel';
import { dtoToFormModel, formModelToDto } from '../variableAdapters';

function model(overrides: Partial<VariableFormModel>): VariableFormModel {
	return { ...emptyVariableFormModel(), name: 'v', ...overrides };
}

/** The list spec a saved variable carries, whatever its plugin. */
function listSpec(m: VariableFormModel): {
	allowMultiple?: boolean;
	allowAllValue?: boolean;
} {
	return formModelToDto(m).spec as {
		allowMultiple?: boolean;
		allowAllValue?: boolean;
	};
}

describe('formModelToDto — the ALL flag needs multi-select', () => {
	it('keeps ALL for a multi-select dynamic variable', () => {
		expect(
			listSpec(
				model({
					type: 'DYNAMIC',
					dynamicAttribute: 'host.name',
					multiSelect: true,
				}),
			),
		).toMatchObject({ allowMultiple: true, allowAllValue: true });
	});

	it('drops ALL for a single-select dynamic variable', () => {
		// The API rejects allowAllValue without allowMultiple, and this used to be forced
		// true for every dynamic variable — which blocked saving the whole dashboard.
		expect(
			listSpec(
				model({
					type: 'DYNAMIC',
					dynamicAttribute: 'host.name',
					multiSelect: false,
				}),
			),
		).toMatchObject({ allowMultiple: false, allowAllValue: false });
	});

	it('drops ALL for a single-select query variable that still carries the flag', () => {
		expect(
			listSpec(
				model({
					type: 'QUERY',
					queryValue: 'SELECT 1',
					multiSelect: false,
					showAllOption: true,
				}),
			),
		).toMatchObject({ allowMultiple: false, allowAllValue: false });
	});

	it('respects the toggle on a multi-select query variable', () => {
		expect(
			listSpec(
				model({
					type: 'QUERY',
					queryValue: 'SELECT 1',
					multiSelect: true,
					showAllOption: false,
				}),
			),
		).toMatchObject({ allowMultiple: true, allowAllValue: false });
	});

	it('round-trips a single-select dynamic variable unchanged', () => {
		// What the dashboard in the report holds: saving it must not flip the flag.
		const dto = {
			kind: 'ListVariable',
			spec: {
				name: 'host.name',
				display: { name: 'host.name', description: '' },
				allowMultiple: false,
				allowAllValue: false,
				sort: 'alphabetical-asc',
				plugin: {
					kind: 'signoz/DynamicVariable',
					spec: { name: 'host.name', signal: 'all' },
				},
			},
		} as never;

		expect(listSpec(dtoToFormModel(dto))).toMatchObject({
			allowMultiple: false,
			allowAllValue: false,
		});
	});
});
