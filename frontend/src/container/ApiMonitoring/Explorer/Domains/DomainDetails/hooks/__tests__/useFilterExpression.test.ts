import { act, renderHook } from '@testing-library/react';
import { FocusEvent } from 'react';

import { useFilterExpression } from '../useFilterExpression';

const expression = "service.name = 'frontend'";

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

	it('commits the draft on blur only when focus leaves the container', () => {
		const onExpressionChange = jest.fn();
		const { result } = renderHook(() =>
			useFilterExpression({ expression, onExpressionChange }),
		);
		const container = document.createElement('div');
		const inside = document.createElement('input');
		container.appendChild(inside);

		act(() => {
			result.current.onDraftChange("service.name = 'cart'");
			result.current.onBlur({
				currentTarget: container,
				relatedTarget: inside,
			} as unknown as FocusEvent<HTMLDivElement>);
		});
		expect(onExpressionChange).not.toHaveBeenCalled();

		act(() => {
			result.current.onBlur({
				currentTarget: container,
				relatedTarget: null,
			} as unknown as FocusEvent<HTMLDivElement>);
		});
		expect(onExpressionChange).toHaveBeenCalledWith("service.name = 'cart'");
	});
});
