import { render, screen } from '@testing-library/react';

import {
	emptyVariableFormModel,
	type VariableFormModel,
} from '../../DashboardSettings/Variables/variableFormModel';
import type { VariableSelectionMap } from '../selectionTypes';
import HiddenVariablesTooltip from '../components/HiddenVariablesTooltip/HiddenVariablesTooltip';

function variable(name: string): VariableFormModel {
	return { ...emptyVariableFormModel(), name };
}

function renderTooltip(
	names: string[],
	selections: VariableSelectionMap,
): HTMLElement {
	render(
		<HiddenVariablesTooltip
			variables={names.map(variable)}
			selections={selections}
		/>,
	);
	return screen.getByTestId('hidden-variables-tooltip');
}

describe('HiddenVariablesTooltip', () => {
	it('names each hidden variable with a $ prefix, apart from its value', () => {
		renderTooltip(['env', 'service'], {
			env: { value: 'production', allSelected: false },
			service: { value: ['checkout', 'cart'], allSelected: false },
		});

		expect(screen.getByText('$env')).toBeInTheDocument();
		expect(screen.getByText('$service')).toBeInTheDocument();
	});

	it('bullets out a variable holding several values', () => {
		renderTooltip(['service'], {
			service: { value: ['checkout', 'cart', 'api'], allSelected: false },
		});

		expect(
			screen.getAllByRole('listitem').map((item) => item.textContent),
		).toStrictEqual(['checkout', 'cart', 'api']);
	});

	it('keeps a lone value unbulleted', () => {
		renderTooltip(['env'], {
			env: { value: 'production', allSelected: false },
		});

		expect(screen.queryByRole('list')).not.toBeInTheDocument();
		expect(screen.getByText('production')).toBeInTheDocument();
	});

	it('labels all-selected and unset variables', () => {
		renderTooltip(['env', 'host'], {
			env: { value: null, allSelected: true },
		});

		expect(screen.getByText('ALL')).toBeInTheDocument();
		expect(screen.getByText('—')).toBeInTheDocument();
	});

	it('lists every hidden variable, however many there are', () => {
		const names = Array.from({ length: 12 }, (_, i) => `var${i}`);

		const tooltip = renderTooltip(names, {});

		expect(tooltip).toHaveTextContent('$var0');
		expect(tooltip).toHaveTextContent('$var11');
	});

	it('bullets every value it is given, without truncating', () => {
		const values = Array.from({ length: 14 }, (_, i) => `v${i}`);

		renderTooltip(['service'], {
			service: { value: values, allSelected: false },
		});

		expect(screen.getAllByRole('listitem')).toHaveLength(14);
	});
});
