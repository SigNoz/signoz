import { FilterProviders } from 'container/ApiMonitoring/__tests__/FilterProviders';
import { getCurrentNuqsSearchParams, resetNuqsState } from 'tests/nuqs-helpers';
import {
	act,
	render,
	renderHook,
	screen,
	userEvent,
	waitFor,
} from 'tests/test-utils';

import { useFilterExpression } from '../useFilterExpression';

const PARAM_KEY = 'testExpression';
const linkExpression = "service.name = 'frontend'";
const linkSearch = `${PARAM_KEY}=${encodeURIComponent(linkExpression)}`;

function renderFilterHook(
	searchParams = '',
): ReturnType<
	typeof renderHook<ReturnType<typeof useFilterExpression>, unknown>
> {
	return renderHook(() => useFilterExpression(), {
		wrapper: ({ children }) => (
			<FilterProviders queryParamKey={PARAM_KEY} searchParams={searchParams}>
				{children}
			</FilterProviders>
		),
	});
}

function FilterBox(): JSX.Element {
	const { expression, onDraftChange, onBlur } = useFilterExpression();

	return (
		<div onBlur={onBlur}>
			<span data-testid="applied">{expression}</span>
			<input
				data-testid="filter-input"
				onChange={(e): void => onDraftChange(e.target.value)}
			/>
			<button type="button" data-testid="inside-button">
				Run
			</button>
		</div>
	);
}

describe('useFilterExpression', () => {
	beforeEach(() => {
		resetNuqsState();
	});

	it('reads the filter from the link', async () => {
		const { result } = renderFilterHook(linkSearch);

		await waitFor(() => expect(result.current.expression).toBe(linkExpression));
		expect(result.current.queryData.dataSource).toBe('traces');
		expect(result.current.queryData.filter?.expression).toBe(linkExpression);
	});

	it('applies a valid expression on run and ignores an invalid one', async () => {
		const { result } = renderFilterHook(linkSearch);
		await waitFor(() => expect(result.current.expression).toBe(linkExpression));

		act(() => {
			result.current.onRun('service.name =');
		});
		expect(result.current.expression).toBe(linkExpression);

		act(() => {
			result.current.onRun('http.status_code = 500');
		});
		expect(result.current.expression).toBe('http.status_code = 500');
		await waitFor(() =>
			expect(getCurrentNuqsSearchParams().get(PARAM_KEY)).toBe(
				'http.status_code = 500',
			),
		);
	});

	it('applies the draft on blur only when focus leaves the container', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(
			<FilterProviders queryParamKey={PARAM_KEY}>
				<FilterBox />
			</FilterProviders>,
		);

		await user.type(screen.getByTestId('filter-input'), "service.name = 'cart'");
		await user.click(screen.getByTestId('inside-button'));
		expect(screen.getByTestId('applied')).toHaveTextContent('');

		await user.click(document.body);
		expect(screen.getByTestId('applied')).toHaveTextContent(
			"service.name = 'cart'",
		);
	});

	it('keeps only the user text when the scope is set', async () => {
		const scope = "http_host = 'api.example.com'";
		const { result } = renderHook(() => useFilterExpression(), {
			wrapper: ({ children }) => (
				<FilterProviders queryParamKey={PARAM_KEY} initialExpression={scope}>
					{children}
				</FilterProviders>
			),
		});
		await waitFor(() => expect(result.current.initialExpression).toBe(scope));

		act(() => {
			result.current.onRun(`${scope} AND (service.name = 'cart')`);
		});

		expect(result.current.expression).toBe("service.name = 'cart'");
		await waitFor(() =>
			expect(getCurrentNuqsSearchParams().get(PARAM_KEY)).toBe(
				"service.name = 'cart'",
			),
		);
	});
});
