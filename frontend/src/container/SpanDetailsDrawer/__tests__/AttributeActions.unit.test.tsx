/* eslint-disable sonarjs/no-duplicate-string */
import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
} from 'tests/test-utils';

import AttributeActions from '../Attributes/AttributeActions';

// Mock only Popover from antd to simplify hover/open behavior while keeping other components real
jest.mock('antd', () => {
	const actual = jest.requireActual('antd');
	const MockPopover = ({
		content,
		children,
		open,
		onOpenChange,
		...rest
	}: any): JSX.Element => (
		<div
			data-testid="mock-popover-wrapper"
			onMouseEnter={(): void => onOpenChange?.(true)}
			{...rest}
		>
			{children}
			{open ? <div data-testid="mock-popover-content">{content}</div> : null}
		</div>
	);
	return { ...actual, Popover: MockPopover };
});

// Mock getAggregateKeys API used inside useTraceActions to resolve autocomplete keys
jest.mock('api/queryBuilder/getAttributeKeys', () => ({
	getAggregateKeys: jest.fn().mockResolvedValue({
		payload: {
			attributeKeys: [
				{
					key: 'http.method',
					dataType: 'string',
					type: 'tag',
					isColumn: true,
				},
			],
		},
	}),
}));

const record = { field: 'http.method', value: 'GET' };

describe('AttributeActions (unit)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders core action buttons (pin, filter in/out, more)', async () => {
		render(<AttributeActions record={record} isPinned={false} />);

		expect(
			screen.getByRole('button', { name: 'Pin attribute' }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'Filter for value' }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'Filter out value' }),
		).toBeInTheDocument();
		// more actions (ellipsis) button
		expect(
			document.querySelector('.lucide-ellipsis')?.closest('button'),
		).toBeInTheDocument();
	});

	it('applies "Filter for" and calls redirectWithQueryBuilderData with correct query', async () => {
		const redirectWithQueryBuilderData = jest.fn();
		const currentQuery = {
			builder: {
				queryData: [
					{
						aggregateOperator: 'count',
						aggregateAttribute: { key: 'signoz_span_duration' },
						filters: { items: [], op: 'AND' },
						filter: { expression: '' },
						groupBy: [],
					},
				],
			},
		} as any;

		render(<AttributeActions record={record} />, undefined, {
			queryBuilderOverrides: { currentQuery, redirectWithQueryBuilderData },
		});

		const filterForBtn = screen.getByRole('button', { name: 'Filter for value' });

		await userEvent.click(filterForBtn);
		await waitFor(() => {
			expect(redirectWithQueryBuilderData).toHaveBeenCalledWith(
				expect.objectContaining({
					builder: expect.objectContaining({
						queryData: expect.arrayContaining([
							expect.objectContaining({
								filters: expect.objectContaining({
									items: expect.arrayContaining([
										expect.objectContaining({
											key: expect.objectContaining({ key: 'http.method' }),
											op: '=',
											value: 'GET',
										}),
									]),
								}),
							}),
						]),
					}),
				}),
				{},
				expect.any(String),
			);
		});
	});

	it('applies "Filter out" and calls redirectWithQueryBuilderData with correct query', async () => {
		const redirectWithQueryBuilderData = jest.fn();
		const currentQuery = {
			builder: {
				queryData: [
					{
						aggregateOperator: 'count',
						aggregateAttribute: { key: 'signoz_span_duration' },
						filters: { items: [], op: 'AND' },
						filter: { expression: '' },
						groupBy: [],
					},
				],
			},
		} as any;

		render(<AttributeActions record={record} />, undefined, {
			queryBuilderOverrides: { currentQuery, redirectWithQueryBuilderData },
		});

		const filterOutBtn = screen.getByRole('button', { name: 'Filter out value' });

		await userEvent.click(filterOutBtn);
		await waitFor(() => {
			expect(redirectWithQueryBuilderData).toHaveBeenCalledWith(
				expect.objectContaining({
					builder: expect.objectContaining({
						queryData: expect.arrayContaining([
							expect.objectContaining({
								filters: expect.objectContaining({
									items: expect.arrayContaining([
										expect.objectContaining({
											key: expect.objectContaining({ key: 'http.method' }),
											op: '!=',
											value: 'GET',
										}),
									]),
								}),
							}),
						]),
					}),
				}),
				{},
				expect.any(String),
			);
		});
	});

	it('opens more actions on hover and calls Group By handler; closes after click', async () => {
		const redirectWithQueryBuilderData = jest.fn();
		const currentQuery = {
			builder: {
				queryData: [
					{
						aggregateOperator: 'count',
						aggregateAttribute: { key: 'signoz_span_duration' },
						filters: { items: [], op: 'AND' },
						filter: { expression: '' },
						groupBy: [],
					},
				],
			},
		} as any;
		render(<AttributeActions record={record} />, undefined, {
			queryBuilderOverrides: { currentQuery, redirectWithQueryBuilderData },
		});

		const ellipsisBtn = document
			.querySelector('.lucide-ellipsis')
			?.closest('button') as HTMLElement;
		expect(ellipsisBtn).toBeInTheDocument();

		// hover to trigger Popover open via mock
		fireEvent.mouseEnter(ellipsisBtn.parentElement as Element);

		// content appears
		await waitFor(() =>
			expect(screen.getByText('Group By Attribute')).toBeInTheDocument(),
		);

		await userEvent.click(screen.getByText('Group By Attribute'));
		await waitFor(() => {
			expect(redirectWithQueryBuilderData).toHaveBeenCalledWith(
				expect.objectContaining({
					builder: expect.objectContaining({
						queryData: expect.arrayContaining([
							expect.objectContaining({
								groupBy: expect.arrayContaining([
									expect.objectContaining({ key: 'http.method' }),
								]),
							}),
						]),
					}),
				}),
				{},
				expect.any(String),
			);
		});

		// After clicking group by, popover should close
		await waitFor(() =>
			expect(screen.queryByTestId('mock-popover-content')).not.toBeInTheDocument(),
		);
	});

	it('hides pin button when showPinned=false', async () => {
		render(<AttributeActions record={record} showPinned={false} />);
		expect(
			screen.queryByRole('button', { name: /pin attribute/i }),
		).not.toBeInTheDocument();
	});

	it('hides copy options when showCopyOptions=false', async () => {
		render(<AttributeActions record={record} showCopyOptions={false} />);
		const ellipsisBtn = document
			.querySelector('.lucide-ellipsis')
			?.closest('button') as HTMLElement;
		fireEvent.mouseEnter(ellipsisBtn.parentElement as Element);

		await waitFor(() =>
			expect(screen.queryByText('Copy Field Name')).not.toBeInTheDocument(),
		);
		expect(screen.queryByText('Copy Field Value')).not.toBeInTheDocument();
	});
});
