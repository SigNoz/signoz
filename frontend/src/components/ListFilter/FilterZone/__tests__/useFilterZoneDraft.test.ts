import { act, renderHook } from '@testing-library/react';

import { useFilterZoneDraft } from '../useFilterZoneDraft';

const BASE_QUERY = "name = 'x'";

function setup(query = BASE_QUERY): {
	result: { current: ReturnType<typeof useFilterZoneDraft> };
	rerender: (props: { query: string }) => void;
	onQueryChange: jest.Mock;
	onFilterApplied: jest.Mock;
	onCleared: jest.Mock;
	onClearAll: jest.Mock;
} {
	const onQueryChange = jest.fn();
	const onFilterApplied = jest.fn();
	const onCleared = jest.fn();
	const onClearAll = jest.fn();
	const { result, rerender } = renderHook(
		({ query: q }: { query: string }) =>
			useFilterZoneDraft({
				query: q,
				onQueryChange,
				onFilterApplied,
				onCleared,
				onClearAll,
			}),
		{ initialProps: { query } },
	);
	return {
		result,
		rerender,
		onQueryChange,
		onFilterApplied,
		onCleared,
		onClearAll,
	};
}

describe('useFilterZoneDraft', () => {
	it('edits a draft without running it until run is called', () => {
		const { result, onQueryChange } = setup();

		act(() => result.current.setDraft("name = 'y'  "));

		expect(result.current.dirty).toBe(true);
		expect(onQueryChange).not.toHaveBeenCalled();

		act(() => result.current.run());

		expect(onQueryChange).toHaveBeenCalledWith("name = 'y'");
	});

	it('does not run a draft that matches the last-run query', () => {
		const { result, onQueryChange } = setup();

		act(() => result.current.run());

		expect(result.current.dirty).toBe(false);
		expect(onQueryChange).not.toHaveBeenCalled();
	});

	it('resyncs the draft when the query changes from outside', () => {
		const { result, rerender } = setup();

		act(() => result.current.setDraft("name = 'typing'"));
		rerender({ query: "name = 'from-view'" });

		expect(result.current.draft).toBe("name = 'from-view'");
		expect(result.current.dirty).toBe(false);
	});

	it('stages a created-by pick into the draft without running it', () => {
		const { result, onQueryChange, onFilterApplied } = setup();

		act(() => result.current.handleCreatedByChange(['a@x.io', 'b@x.io']));

		expect(result.current.draft).toBe(
			"name = 'x' AND created_by IN ['a@x.io', 'b@x.io']",
		);
		expect(result.current.reflected.createdBy).toStrictEqual([
			'a@x.io',
			'b@x.io',
		]);
		expect(onFilterApplied).toHaveBeenCalledWith('createdBy', { valueCount: 2 });
		expect(onQueryChange).not.toHaveBeenCalled();
	});

	it('runs an updated-window pick immediately', () => {
		const { result, onQueryChange, onFilterApplied } = setup();

		act(() => result.current.handleUpdatedChange('7d'));

		expect(onFilterApplied).toHaveBeenCalledWith('updatedWindow', {});
		expect(onQueryChange).toHaveBeenCalledTimes(1);
		expect(onQueryChange.mock.calls[0][0]).toContain("name = 'x' AND updated_at");
		expect(result.current.reflected.updated).toBe('7d');
	});

	it('drops the created-by clause and runs when created-by is cleared', () => {
		const { result, onQueryChange } = setup(
			"created_by = 'a@x.io' AND name = 'x'",
		);

		act(() => result.current.handleClearCreatedBy());

		expect(result.current.draft).toBe("name = 'x'");
		expect(onQueryChange).toHaveBeenCalledWith("name = 'x'");
	});

	it('empties the draft and runs the empty query on clear', () => {
		const { result, onQueryChange, onCleared, onClearAll } = setup();

		act(() => result.current.handleClear());

		expect(result.current.draft).toBe('');
		expect(result.current.isEmpty).toBe(true);
		expect(onCleared).toHaveBeenCalledTimes(1);
		expect(onQueryChange).toHaveBeenCalledWith('');
		expect(onClearAll).toHaveBeenCalledTimes(1);
	});

	it('skips re-running an already-empty query on clear', () => {
		const { result, onQueryChange, onClearAll } = setup('');

		act(() => result.current.handleClear());

		expect(onQueryChange).not.toHaveBeenCalled();
		expect(onClearAll).toHaveBeenCalledTimes(1);
	});
});
