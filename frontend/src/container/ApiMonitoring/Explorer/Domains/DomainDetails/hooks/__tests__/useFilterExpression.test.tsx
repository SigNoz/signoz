import { act, render, renderHook, screen, userEvent } from 'tests/test-utils';

import { useFilterExpression } from '../useFilterExpression';

const expression = "service.name = 'frontend'";

function FilterBox({
	onExpressionChange,
}: {
	onExpressionChange: (expression: string) => void;
}): JSX.Element {
	const { onDraftChange, onBlur } = useFilterExpression({
		expression,
		onExpressionChange,
	});

	return (
		<div onBlur={onBlur}>
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
	it('builds a traces query that carries the expression', () => {
		const { result } = renderHook(() =>
			useFilterExpression({ expression, onExpressionChange: jest.fn() }),
		);

		expect(result.current.queryData.dataSource).toBe('traces');
		expect(result.current.queryData.filter?.expression).toBe(expression);
	});

	it('commits a changed expression on run', () => {
		const onExpressionChange = jest.fn();
		const { result } = renderHook(() =>
			useFilterExpression({ expression, onExpressionChange }),
		);

		act(() => {
			result.current.onRun(`${expression} AND http.status_code = 500`);
		});

		expect(onExpressionChange).toHaveBeenCalledWith(
			`${expression} AND http.status_code = 500`,
		);
	});

	it('ignores an unchanged or invalid expression', () => {
		const onExpressionChange = jest.fn();
		const { result } = renderHook(() =>
			useFilterExpression({ expression, onExpressionChange }),
		);

		act(() => {
			result.current.onRun(expression);
			result.current.onRun('service.name =');
		});

		expect(onExpressionChange).not.toHaveBeenCalled();
	});

	it('commits the draft on blur only when focus leaves the container', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onExpressionChange = jest.fn();
		render(<FilterBox onExpressionChange={onExpressionChange} />);

		await user.type(screen.getByTestId('filter-input'), "service.name = 'cart'");
		await user.click(screen.getByTestId('inside-button'));
		expect(onExpressionChange).not.toHaveBeenCalled();

		await user.click(document.body);
		expect(onExpressionChange).toHaveBeenCalledWith("service.name = 'cart'");
	});
});
