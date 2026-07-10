import type {
	PanelQueryData,
	PanelTable,
} from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

import type { PanelOfKind } from '../../../types/rendererProps';
import { prepareScalarTables } from '../../../../queryV5/prepareScalarTables';
import { buildTableCsvRows, getTableCsvRows } from '../tableCsv';

// Stub number/unit formatting so assertions cover only the row-building.
jest.mock('../../../utils/formatPanelValue', () => ({
	formatPanelValue: (value: number, unit?: string): string =>
		`${value}${unit ?? ''}`,
}));

jest.mock('../../../../queryV5/prepareScalarTables', () => ({
	prepareScalarTables: jest.fn(),
}));
jest.mock('../../../../queryV5/v5ResponseData', () => ({
	getScalarResults: jest.fn(() => []),
}));

const mockPrepareScalarTables = prepareScalarTables as jest.MockedFunction<
	typeof prepareScalarTables
>;

const table: PanelTable = {
	queryName: 'A',
	legend: '',
	columns: [
		{ name: 'service', queryName: 'A', isValueColumn: false, id: 'service' },
		{ name: 'p99', queryName: 'A', isValueColumn: true, id: 'A' },
	],
	rows: [
		{ data: { service: 'frontend', A: 1234 } },
		{ data: { service: 'cart', A: 56 } },
	],
};

describe('buildTableCsvRows', () => {
	it('keys rows by column name in display order and formats value columns', () => {
		const rows = buildTableCsvRows({
			table,
			columnUnits: { A: 'ms' },
			decimalPrecision: undefined,
		});

		expect(rows).toStrictEqual([
			{ service: 'frontend', p99: '1234ms' },
			{ service: 'cart', p99: '56ms' },
		]);
		expect(Object.keys(rows[0])).toStrictEqual(['service', 'p99']);
	});

	it('renders group columns and non-numeric value cells as raw text', () => {
		const rows = buildTableCsvRows({
			table: {
				...table,
				rows: [{ data: { service: 'api', A: 'n/a' } }],
			},
			columnUnits: {},
			decimalPrecision: undefined,
		});

		expect(rows).toStrictEqual([{ service: 'api', p99: 'n/a' }]);
	});
});

describe('getTableCsvRows', () => {
	const panel = {
		spec: { plugin: { spec: { formatting: { columnUnits: { A: 'ms' } } } } },
	} as unknown as PanelOfKind<'signoz/TablePanel'>;
	const data = {} as PanelQueryData;

	beforeEach(() => jest.clearAllMocks());

	it('prepares the scalar table and flattens the first non-empty one to rows', () => {
		mockPrepareScalarTables.mockReturnValue([table]);

		expect(getTableCsvRows(panel, data)).toStrictEqual([
			{ service: 'frontend', p99: '1234ms' },
			{ service: 'cart', p99: '56ms' },
		]);
	});

	it('returns no rows when the response has no table', () => {
		mockPrepareScalarTables.mockReturnValue([]);

		expect(getTableCsvRows(panel, data)).toStrictEqual([]);
	});
});
