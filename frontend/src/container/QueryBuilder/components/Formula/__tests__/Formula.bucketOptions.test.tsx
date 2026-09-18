import { PANEL_TYPES } from 'constants/queryBuilder';
import { render, screen, userEvent } from 'tests/test-utils';
import type { IBuilderFormula } from 'types/api/queryBuilder/queryBuilderData';

import { Formula } from '../Formula';

const mockHandleChangeFormulaData = jest.fn();
let mockPanelType: PANEL_TYPES = PANEL_TYPES.HEATMAP;

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): Record<string, unknown> => ({
		removeQueryBuilderEntityByIndex: jest.fn(),
		handleSetFormulaData: jest.fn(),
		panelType: mockPanelType,
		currentQuery: { unit: undefined },
	}),
}));

jest.mock('hooks/queryBuilder/useQueryBuilderOperations', () => ({
	useQueryOperations: (): Record<string, unknown> => ({
		handleChangeFormulaData: mockHandleChangeFormulaData,
	}),
}));

jest.mock('../../QBEntityOptions/QBEntityOptions', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="qb-entity-options" />,
}));

function formula(overrides: Partial<IBuilderFormula> = {}): IBuilderFormula {
	return {
		queryName: 'F1',
		expression: 'A',
		legend: '',
		disabled: false,
		...overrides,
	};
}

function renderFormula(overrides: Partial<IBuilderFormula> = {}): void {
	render(
		<Formula index={0} formula={formula(overrides)} query={{} as never} isQBV2 />,
	);
}

describe('Formula bucket options', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockPanelType = PANEL_TYPES.HEATMAP;
	});

	it('offers a bucket axis on a heatmap', () => {
		renderFormula();

		expect(screen.getByTestId('bucket-options')).toBeInTheDocument();
	});

	it('is not dismissable — a formula has no add-on toggle bar to collapse into', () => {
		renderFormula();

		expect(screen.queryByTestId('bucket-options-close')).not.toBeInTheDocument();
	});

	it('offers no bucket axis on other panel types', () => {
		mockPanelType = PANEL_TYPES.TIME_SERIES;
		renderFormula();

		expect(screen.queryByTestId('bucket-options')).not.toBeInTheDocument();
	});

	it('opens on the axis the formula already carries', () => {
		renderFormula({
			bucketOptions: { kind: 'log', spec: { scale: 0 } } as never,
		});

		expect(screen.getByRole('radio', { name: 'Log' })).toBeChecked();
		expect(screen.getByRole('radio', { name: '1' })).toBeChecked();
	});

	it('writes the picked axis onto the formula', async () => {
		const user = userEvent.setup();
		renderFormula();

		await user.click(screen.getByRole('radio', { name: 'Log' }));

		expect(mockHandleChangeFormulaData).toHaveBeenCalledWith('bucketOptions', {
			kind: 'log',
			spec: { scale: 4 },
		});
	});
});
