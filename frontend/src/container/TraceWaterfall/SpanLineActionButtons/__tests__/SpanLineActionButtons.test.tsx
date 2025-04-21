import { fireEvent, screen } from '@testing-library/react';
import { useCopySpanLink } from 'hooks/trace/useCopySpanLink';
import { render } from 'tests/test-utils';
import { Span } from 'types/api/trace/getTraceV2';

import SpanLineActionButtons from '../index';

// Mock the useCopySpanLink hook
jest.mock('hooks/trace/useCopySpanLink');

const mockSpan: Span = {
	spanId: 'test-span-id',
	name: 'test-span',
	serviceName: 'test-service',
	durationNano: 1000,
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

describe('SpanLineActionButtons', () => {
	beforeEach(() => {
		// Clear mock before each test
		jest.clearAllMocks();
	});

	it('renders copy link button with correct icon', () => {
		(useCopySpanLink as jest.Mock).mockReturnValue({
			onSpanCopy: jest.fn(),
		});

		render(<SpanLineActionButtons span={mockSpan} />);

		// Check if the button is rendered
		const copyButton = screen.getByRole('button');
		expect(copyButton).toBeInTheDocument();

		// Check if the link icon is rendered
		const linkIcon = screen.getByRole('img', { hidden: true });
		expect(linkIcon).toHaveClass('anticon anticon-link');
	});

	it('calls onSpanCopy when copy button is clicked', () => {
		const mockOnSpanCopy = jest.fn();
		(useCopySpanLink as jest.Mock).mockReturnValue({
			onSpanCopy: mockOnSpanCopy,
		});

		render(<SpanLineActionButtons span={mockSpan} />);

		// Click the copy button
		const copyButton = screen.getByRole('button');
		fireEvent.click(copyButton);

		// Verify the copy function was called
		expect(mockOnSpanCopy).toHaveBeenCalledTimes(1);
	});

	it('applies correct styling classes', () => {
		(useCopySpanLink as jest.Mock).mockReturnValue({
			onSpanCopy: jest.fn(),
		});

		render(<SpanLineActionButtons span={mockSpan} />);

		// Check if the main container has the correct class
		const container = screen
			.getByRole('button')
			.closest('.span-line-action-buttons');
		expect(container).toHaveClass('span-line-action-buttons');

		// Check if the button has the correct class
		const copyButton = screen.getByRole('button');
		expect(copyButton).toHaveClass('copy-span-btn');
	});

	it('copies span link to clipboard when copy button is clicked', () => {
		const mockSetCopy = jest.fn();
		const mockUrlQuery = {
			delete: jest.fn(),
			set: jest.fn(),
			toString: jest.fn().mockReturnValue('spanId=test-span-id'),
		};
		const mockPathname = '/test-path';
		const mockLocation = {
			origin: 'http://localhost:3000',
		};

		// Mock window.location
		Object.defineProperty(window, 'location', {
			value: mockLocation,
			writable: true,
		});

		// Mock useCopySpanLink hook
		(useCopySpanLink as jest.Mock).mockReturnValue({
			onSpanCopy: (event: React.MouseEvent) => {
				event.preventDefault();
				event.stopPropagation();
				mockUrlQuery.delete('spanId');
				mockUrlQuery.set('spanId', mockSpan.spanId);
				const link = `${
					window.location.origin
				}${mockPathname}?${mockUrlQuery.toString()}`;
				mockSetCopy(link);
			},
		});

		render(<SpanLineActionButtons span={mockSpan} />);

		// Click the copy button
		const copyButton = screen.getByRole('button');
		fireEvent.click(copyButton);

		// Verify the copy function was called with correct link
		expect(mockSetCopy).toHaveBeenCalledWith(
			'http://localhost:3000/test-path?spanId=test-span-id',
		);
	});
});
