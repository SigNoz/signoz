import { act, renderHook } from '@testing-library/react';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { useIsTextSelected } from 'hooks/useIsTextSelected';
import { ILog } from 'types/api/logs/log';

import useLogDetailHandlers from '../useLogDetailHandlers';

jest.mock('hooks/logs/useActiveLog');
jest.mock('hooks/useIsTextSelected');

const mockOnSetActiveLog = jest.fn();
const mockOnClearActiveLog = jest.fn();
const mockOnAddToQuery = jest.fn();
const mockOnGroupByAttribute = jest.fn();
const mockIsTextSelected = jest.fn();

const mockLog: ILog = {
	id: 'log-1',
	timestamp: '2024-01-01T00:00:00Z',
	date: '2024-01-01',
	body: 'test log body',
	severityText: 'INFO',
	severityNumber: 9,
	traceFlags: 0,
	traceId: '',
	spanID: '',
	attributesString: {},
	attributesInt: {},
	attributesFloat: {},
	resources_string: {},
	scope_string: {},
	attributes_string: {},
	severity_text: '',
	severity_number: 0,
};

beforeEach(() => {
	jest.clearAllMocks();

	jest.mocked(useIsTextSelected).mockReturnValue(mockIsTextSelected);

	jest.mocked(useActiveLog).mockReturnValue({
		activeLog: null,
		onSetActiveLog: mockOnSetActiveLog,
		onClearActiveLog: mockOnClearActiveLog,
		onAddToQuery: mockOnAddToQuery,
		onGroupByAttribute: mockOnGroupByAttribute,
	});
});

it('should not open log detail when text is selected', () => {
	mockIsTextSelected.mockReturnValue(true);

	const { result } = renderHook(() => useLogDetailHandlers());

	act(() => {
		result.current.handleSetActiveLog(mockLog);
	});

	expect(mockOnSetActiveLog).not.toHaveBeenCalled();
});

it('should open log detail when no text is selected', () => {
	mockIsTextSelected.mockReturnValue(false);

	const { result } = renderHook(() => useLogDetailHandlers());

	act(() => {
		result.current.handleSetActiveLog(mockLog);
	});

	expect(mockOnSetActiveLog).toHaveBeenCalledWith(mockLog);
});

it('should toggle off when clicking the same active log', () => {
	mockIsTextSelected.mockReturnValue(false);

	jest.mocked(useActiveLog).mockReturnValue({
		activeLog: mockLog,
		onSetActiveLog: mockOnSetActiveLog,
		onClearActiveLog: mockOnClearActiveLog,
		onAddToQuery: mockOnAddToQuery,
		onGroupByAttribute: mockOnGroupByAttribute,
	});

	const { result } = renderHook(() => useLogDetailHandlers());

	act(() => {
		result.current.handleSetActiveLog(mockLog);
	});

	expect(mockOnClearActiveLog).toHaveBeenCalled();
	expect(mockOnSetActiveLog).not.toHaveBeenCalled();
});
