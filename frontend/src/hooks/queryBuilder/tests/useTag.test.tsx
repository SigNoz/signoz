import { renderHook } from '@testing-library/react';
import { queryMockData } from 'container/QueryBuilder/mock/queryData';
import { act } from 'react-dom/test-utils';

import { useTag } from '../useTag';

describe('useTag', () => {
	test('should add a new tag', () => {
		const handleSearchMock = jest.fn();
		const { result } = renderHook(() =>
			useTag('test', true, true, handleSearchMock, queryMockData),
		);

		act(() => {
			// eslint-disable-next-line sonarjs/no-duplicate-string
			result.current.handleAddTag('tag1 = tag');
		});

		expect(result.current.tags).toEqual(['tag1 = tag']);
		expect(handleSearchMock).toHaveBeenCalledWith('');

		act(() => {
			result.current.handleAddTag('tag2 = tag');
		});

		expect(result.current.tags).toEqual(['tag1 = tag', 'tag2 = tag']);
		expect(handleSearchMock).toHaveBeenCalledWith('');
	});

	test('should remove a tag', () => {
		const handleSearchMock = jest.fn();
		const { result } = renderHook(() =>
			useTag('test', true, true, handleSearchMock, queryMockData),
		);

		act(() => {
			result.current.handleAddTag('tag1 != tag');
			result.current.handleAddTag('tag2 != tag');
			result.current.handleAddTag('tag3 != tag');
		});

		act(() => {
			result.current.handleClearTag('tag2 != tag');
		});

		expect(result.current.tags).toEqual(['tag1 != tag', 'tag3 != tag']);
	});

	test('should update a tag', () => {
		const handleSearchMock = jest.fn();
		const { result } = renderHook(() =>
			useTag('test', true, true, handleSearchMock, queryMockData),
		);
		act(() => {
			result.current.handleAddTag('tag1 LIKE tag');
			result.current.handleAddTag('tag2 LIKE tag');
			result.current.handleAddTag('tag3 LIKE tag');
		});

		act(() => {
			result.current.updateTag('tag2 LIKE tag');
		});

		expect(result.current.tags).toEqual(['tag1 LIKE tag', 'tag3 LIKE tag']);
	});

	test('should remove a tag when clicking on it', () => {
		const handleSearchMock = jest.fn();
		const { result } = renderHook(() =>
			useTag('test', true, false, handleSearchMock, queryMockData),
		);

		act(() => {
			result.current.handleAddTag('test != test1');
		});

		const [tagToRemove] = result.current.tags;

		act(() => {
			result.current.updateTag(tagToRemove);
		});

		expect(result.current.tags).toEqual([]);
	});

	test('should not add an invalid tag', () => {
		const handleSearchMock = jest.fn();
		const { result } = renderHook(() =>
			useTag('test', false, true, handleSearchMock, queryMockData),
		);

		act(() => {
			result.current.handleAddTag('tag1 =');
		});

		expect(result.current.tags).toEqual(['tag1 =']);
	});

	test('should add a free text tag', () => {
		const handleSearchMock = jest.fn();
		const { result } = renderHook(() =>
			useTag('test', true, true, handleSearchMock, queryMockData),
		);

		act(() => {
			result.current.handleAddTag('abc != 123');
		});

		expect(result.current.tags).toEqual(['abc != 123']);
		expect(handleSearchMock).toHaveBeenCalledWith('');
	});

	test('should add an EXISTS tag', () => {
		const handleSearchMock = jest.fn();
		const { result } = renderHook(() =>
			useTag('test', true, true, handleSearchMock, queryMockData),
		);

		act(() => {
			result.current.handleAddTag('signoz EXISTS');
		});

		expect(result.current.tags).toEqual(['signoz EXISTS']);
		expect(handleSearchMock).toHaveBeenCalledWith('');
	});

	test('should add an NOT_EXISTS tag', () => {
		const handleSearchMock = jest.fn();
		const { result } = renderHook(() =>
			useTag('test', true, true, handleSearchMock, queryMockData),
		);

		act(() => {
			result.current.handleAddTag('signoz NOT_EXISTS');
		});

		expect(result.current.tags).toEqual(['signoz NOT_EXISTS']);
		expect(handleSearchMock).toHaveBeenCalledWith('');
	});

	test('should add an IN  isMulti true add multiple value tag', () => {
		const handleSearchMock = jest.fn();
		const { result } = renderHook(() =>
			useTag('test', true, true, handleSearchMock, queryMockData),
		);

		act(() => {
			result.current.handleAddTag('signoz IN signoz_io, promethus');
		});

		expect(result.current.tags).toEqual(['signoz IN signoz_io, promethus']);
		expect(handleSearchMock).toHaveBeenCalledWith('');
	});

	test('should add an NOT_IN isMulti true add multiple value tag', () => {
		const handleSearchMock = jest.fn();
		const { result } = renderHook(() =>
			useTag('test', true, true, handleSearchMock, queryMockData),
		);

		act(() => {
			result.current.handleAddTag('signoz NOT_IN signoz_io, promethus');
		});

		expect(result.current.tags).toEqual(['signoz NOT_IN signoz_io, promethus']);
		expect(handleSearchMock).toHaveBeenCalledWith('');
	});
});
