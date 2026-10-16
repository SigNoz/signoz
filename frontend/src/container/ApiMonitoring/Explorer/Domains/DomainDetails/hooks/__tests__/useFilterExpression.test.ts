import { act, renderHook } from '@testing-library/react';
import { FocusEvent } from 'react';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import { useFilterExpression } from '../useFilterExpression';

const filters: IBuilderQuery['filters'] = {
	op: 'AND',
	items: [
		{
			id: 'a',
			key: { key: 'service.name', dataType: DataTypes.String, type: '' },
			op: '=',
			value: 'frontend',
		},
	],
};

describe('useFilterExpression', () => {
	it('builds a traces query that carries the items as an expression', () => {
		const { result } = renderHook(() =>
			useFilterExpression({ filters, onFiltersChange: jest.fn() }),
		);

		expect(result.current.queryData.dataSource).toBe('traces');
		expect(result.current.queryData.filters).toBe(filters);
		expect(result.current.queryData.filter?.expression).toBe(
			"service.name = 'frontend'",
		);
	});

	it('converts a run expression back to items', () => {
		const onFiltersChange = jest.fn();
		const { result } = renderHook(() =>
			useFilterExpression({ filters, onFiltersChange }),
		);

		act(() => {
			result.current.onRun("service.name = 'frontend' AND http.status_code = 500");
		});

		expect(onFiltersChange).toHaveBeenCalledTimes(1);
		const next = onFiltersChange.mock.calls[0][0] as IBuilderQuery['filters'];
		expect(next?.items.map((item) => item.key?.key)).toStrictEqual([
			'service.name',
			'http.status_code',
		]);
	});

	it('ignores an unchanged or invalid expression', () => {
		const onFiltersChange = jest.fn();
		const { result } = renderHook(() =>
			useFilterExpression({ filters, onFiltersChange }),
		);

		act(() => {
			result.current.onRun("service.name = 'frontend'");
			result.current.onRun('service.name =');
		});

		expect(onFiltersChange).not.toHaveBeenCalled();
	});

	it('commits the draft on blur only when focus leaves the container', () => {
		const onFiltersChange = jest.fn();
		const { result } = renderHook(() =>
			useFilterExpression({ filters, onFiltersChange }),
		);
		const container = document.createElement('div');
		const inside = document.createElement('input');
		container.appendChild(inside);

		act(() => {
			result.current.onExpressionChange("service.name = 'cart'");
			result.current.onBlur({
				currentTarget: container,
				relatedTarget: inside,
			} as unknown as FocusEvent<HTMLDivElement>);
		});
		expect(onFiltersChange).not.toHaveBeenCalled();

		act(() => {
			result.current.onBlur({
				currentTarget: container,
				relatedTarget: null,
			} as unknown as FocusEvent<HTMLDivElement>);
		});
		expect(onFiltersChange).toHaveBeenCalledTimes(1);
	});
});
