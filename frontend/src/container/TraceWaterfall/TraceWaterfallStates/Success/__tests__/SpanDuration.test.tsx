import { fireEvent, screen } from '@testing-library/react';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { render } from 'tests/test-utils';
import { Span } from 'types/api/trace/getTraceV2';

import { SpanDuration } from '../Success';

// Mock the hooks
jest.mock('hooks/useSafeNavigate');
jest.mock('hooks/useUrlQuery');

const mockSpan: Span = {
	spanId: 'test-span-id',
	name: 'test-span',
	serviceName: 'test-service',
	durationNano: 1160000, // 1ms in nano
	timestamp: 1234567890,
	rootSpanId: 'test-root-span-id',
	parentSpanId: 'test-parent-span-id',
	traceId: 'test-trace-id',
	hasError: false,
	kind: 0,
	references: [],
	tagMap: {},
	event: [],
	rootName: 'test-root-name',
	statusMessage: 'test-status-message',
	statusCodeString: 'test-status-code-string',
	spanKind: 'test-span-kind',
	hasChildren: false,
	hasSibling: false,
	subTreeNodeCount: 0,
	level: 0,
};

const mockTraceMetadata = {
	traceId: 'test-trace-id',
	startTime: 1234567000,
	endTime: 1234569000,
	hasMissingSpans: false,
};

jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};
	const uplotMock = jest.fn(() => ({
		paths,
	}));
	return {
		paths,
		default: uplotMock,
	};
});

describe('SpanDuration', () => {
	const mockSetSelectedSpan = jest.fn();
	const mockUrlQuerySet = jest.fn();
	const mockSafeNavigate = jest.fn();
	const mockUrlQueryGet = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock URL query hook
		(useUrlQuery as jest.Mock).mockReturnValue({
			set: mockUrlQuerySet,
			get: mockUrlQueryGet,
			toString: () => 'spanId=test-span-id',
		});

		// Mock safe navigate hook
		(useSafeNavigate as jest.Mock).mockReturnValue({
			safeNavigate: mockSafeNavigate,
		});
	});

	it('updates URL and selected span when clicked', () => {
		render(
			<SpanDuration
				span={mockSpan}
				traceMetadata={mockTraceMetadata}
				selectedSpan={undefined}
				setSelectedSpan={mockSetSelectedSpan}
			/>,
		);

		// Find and click the span duration element
		const spanElement = screen.getByText('1.16 ms');
		fireEvent.click(spanElement);

		// Verify setSelectedSpan was called with the correct span
		expect(mockSetSelectedSpan).toHaveBeenCalledWith(mockSpan);

		// Verify URL query was updated
		expect(mockUrlQuerySet).toHaveBeenCalledWith('spanId', 'test-span-id');

		// Verify navigation was triggered
		expect(mockSafeNavigate).toHaveBeenCalledWith({
			search: 'spanId=test-span-id',
		});
	});

	it('shows action buttons on hover', () => {
		render(
			<SpanDuration
				span={mockSpan}
				traceMetadata={mockTraceMetadata}
				selectedSpan={undefined}
				setSelectedSpan={mockSetSelectedSpan}
			/>,
		);

		const spanElement = screen.getByText('1.16 ms');

		// Initially, action buttons should not be visible
		expect(screen.queryByRole('button')).not.toBeInTheDocument();

		// Hover over the span
		fireEvent.mouseEnter(spanElement);

		// Action buttons should now be visible
		expect(screen.getByRole('button')).toBeInTheDocument();

		// Mouse leave should hide the buttons
		fireEvent.mouseLeave(spanElement);
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('applies interested-span class when span is selected', () => {
		render(
			<SpanDuration
				span={mockSpan}
				traceMetadata={mockTraceMetadata}
				selectedSpan={mockSpan}
				setSelectedSpan={mockSetSelectedSpan}
			/>,
		);

		const spanElement = screen.getByText('1.16 ms').closest('.span-duration');
		expect(spanElement).toHaveClass('interested-span');
	});
});
