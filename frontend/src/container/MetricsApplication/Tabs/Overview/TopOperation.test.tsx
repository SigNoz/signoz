import { act, render, screen } from 'tests/test-utils';

import TopOperation from './TopOperation';

jest.mock('hooks/useResourceAttribute', () => ({
	__esModule: true,
	default: jest.fn().mockReturnValue({
		queries: [],
	}),
}));

describe('TopOperation', () => {
	test('TopOperation component should render', async () => {
		act(() => {
			render(<TopOperation />);
		});
		const loadingText = screen.getByText(/loading/i);
		expect(loadingText).toBeInTheDocument();
	});

	test('TopOperation component should load the table', async () => {
		act(() => {
			render(<TopOperation />);
		});
		const table = await screen.findByRole('table');
		expect(table).toBeInTheDocument();
		const keyOperationsTableTitle = await screen.findByText(/key operations/i);
		expect(keyOperationsTableTitle).toBeInTheDocument();

		const nameTableHeader = await screen.findByRole('columnheader', {
			name: /name/i,
		});
		expect(nameTableHeader).toBeInTheDocument();

		const p90TableHeader = await screen.findByRole('columnheader', {
			name: /p50 \(in ms\)/i,
		});
		expect(p90TableHeader).toBeInTheDocument();

		const p95TableHeader = await screen.findByRole('columnheader', {
			name: /p95 \(in ms\)/i,
		});
		expect(p95TableHeader).toBeInTheDocument();

		const p99TableHeader = await screen.findByRole('columnheader', {
			name: /p99 \(in ms\)/i,
		});
		expect(p99TableHeader).toBeInTheDocument();

		const numberOfCallHeader = await screen.findByRole('columnheader', {
			name: /number of calls/i,
		});
		expect(numberOfCallHeader).toBeInTheDocument();

		const errorRateHeader = await screen.findByRole('columnheader', {
			name: /error rate/i,
		});
		expect(errorRateHeader).toBeInTheDocument();
	});

	test('TopOperation should load correct from the api', async () => {
		act(() => {
			render(<TopOperation />);
		});
		const loadingText = screen.getByText(/loading/i);
		expect(loadingText).toBeInTheDocument();

		const tableRow = await screen.findByRole('cell', {
			name: /HTTP GET \/customer/i,
		});
		expect(tableRow).toBeInTheDocument();

		const p90Row = screen.getByRole('cell', {
			name: /310\.91/i,
		});
		expect(p90Row).toBeInTheDocument();

		const p95Row = await screen.findByRole('cell', {
			name: /573\.29/i,
		});
		expect(p95Row).toBeInTheDocument();

		const p99Row = await screen.findByRole('cell', {
			name: /749\.92/i,
		});
		expect(p99Row).toBeInTheDocument();

		const numberOfCallsRow = await screen.findByRole('cell', {
			name: /1626/i,
		});
		expect(numberOfCallsRow).toBeInTheDocument();

		const errorRateRow = await screen.findByRole('cell', {
			name: /0.00 %/i,
		});
		expect(errorRateRow).toBeInTheDocument();
	});
});
