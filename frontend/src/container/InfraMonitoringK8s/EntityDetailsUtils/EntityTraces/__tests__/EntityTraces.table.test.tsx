import { act, screen, within } from 'tests/test-utils';

import { renderEntityTraces } from './testUtils';
import { mockQueryRangeV5WithTracesResponse } from '__tests__/query_range_v5.util';

// Trace list columns are hidden below the antd `md` breakpoint. The global
// matchMedia mock reports `matches: false`, which drops every column, so make
// all breakpoints match for these rendering tests.
jest.spyOn(window, 'matchMedia').mockImplementation(
	(query: string) =>
		({
			matches: true,
			media: query,
			onchange: null,
			addListener: jest.fn(),
			removeListener: jest.fn(),
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
			dispatchEvent: jest.fn(),
		}) as unknown as MediaQueryList,
);

describe('EntityTraces - Table Rendering', () => {
	it('should render table with all column headers', async () => {
		mockQueryRangeV5WithTracesResponse({ pageSize: 3 });

		act(() => {
			renderEntityTraces();
		});

		await expect(screen.findByText('Service Name')).resolves.toBeInTheDocument();

		const headerTexts = within(screen.getByRole('table'))
			.getAllByRole('columnheader')
			.map((header) => header.textContent);

		expect(headerTexts).toStrictEqual(
			expect.arrayContaining([
				'Timestamp',
				'Service Name',
				'Name',
				'Duration',
				'HTTP Method',
				'Status Code',
			]),
		);
	});

	it('should render trace values in table cells', async () => {
		mockQueryRangeV5WithTracesResponse({
			customTraces: [
				{
					serviceName: 'checkout-service',
					name: 'GET /api/checkout',
					durationNano: 5000000,
					httpMethod: 'GET',
					responseStatusCode: '200',
				},
			],
		});

		act(() => {
			renderEntityTraces();
		});

		await expect(screen.findByTestId('serviceName')).resolves.toHaveTextContent(
			'checkout-service',
		);
		expect(screen.getByTestId('name')).toHaveTextContent('GET /api/checkout');
		expect(screen.getByTestId('durationNano')).toHaveTextContent('5.00ms');
		expect(screen.getByTestId('httpMethod')).toHaveTextContent('GET');
		expect(screen.getByTestId('responseStatusCode')).toHaveTextContent('200');
	});

	it('should render http method as robin colored outline badge', async () => {
		mockQueryRangeV5WithTracesResponse({
			customTraces: [{ httpMethod: 'POST', responseStatusCode: '200' }],
		});

		act(() => {
			renderEntityTraces();
		});

		const badge = await screen.findByTestId('httpMethod');
		expect(badge).toHaveTextContent('POST');
		expect(badge).toHaveAttribute('data-color', 'robin');
		expect(badge).toHaveAttribute('data-variant', 'outline');
	});

	it('should render N/A when http method is empty', async () => {
		mockQueryRangeV5WithTracesResponse({
			customTraces: [{ httpMethod: '', responseStatusCode: '200' }],
		});

		act(() => {
			renderEntityTraces();
		});

		await expect(screen.findByText('N/A')).resolves.toBeInTheDocument();
		expect(screen.queryByTestId('httpMethod')).not.toBeInTheDocument();
	});

	it('should render status code badge color per status range', async () => {
		mockQueryRangeV5WithTracesResponse({
			customTraces: [
				{ responseStatusCode: '200' },
				{ responseStatusCode: '302' },
				{ responseStatusCode: '404' },
				{ responseStatusCode: '500' },
				{ responseStatusCode: '100' },
			],
		});

		act(() => {
			renderEntityTraces();
		});

		const badges = await screen.findAllByTestId('responseStatusCode');
		const badgeColors = badges.map((badge) => badge.getAttribute('data-color'));

		expect(badgeColors).toStrictEqual([
			'forest', // 2xx -> success
			'robin', // 3xx -> redirect
			'amber', // 4xx -> client error
			'cherry', // 5xx -> server error
			'vanilla', // 1xx -> informational
		]);
	});

	it('should render non-numeric status code as plain text without badge', async () => {
		mockQueryRangeV5WithTracesResponse({
			customTraces: [{ responseStatusCode: 'unknown' }],
		});

		act(() => {
			renderEntityTraces();
		});

		await expect(screen.findByText('unknown')).resolves.toBeInTheDocument();
		expect(screen.queryByTestId('responseStatusCode')).not.toBeInTheDocument();
	});

	it('should link cells to trace details page', async () => {
		mockQueryRangeV5WithTracesResponse({
			customTraces: [{ serviceName: 'frontend' }],
		});

		act(() => {
			renderEntityTraces();
		});

		await expect(screen.findByTestId('serviceName')).resolves.toBeInTheDocument();

		const links = within(screen.getByRole('table')).getAllByRole('link');

		expect(links.length).toBeGreaterThan(0);
		links.forEach((link) => {
			expect(link).toHaveAttribute(
				'href',
				expect.stringContaining('/trace/trace-id-0'),
			);
		});
	});

	it('should render one row per trace', async () => {
		mockQueryRangeV5WithTracesResponse({
			customTraces: [
				{ serviceName: 'frontend' },
				{ serviceName: 'backend' },
				{ serviceName: 'database' },
			],
		});

		act(() => {
			renderEntityTraces();
		});

		const serviceCells = await screen.findAllByTestId('serviceName');
		expect(serviceCells.map((cell) => cell.textContent)).toStrictEqual([
			'frontend',
			'backend',
			'database',
		]);
	});
});
