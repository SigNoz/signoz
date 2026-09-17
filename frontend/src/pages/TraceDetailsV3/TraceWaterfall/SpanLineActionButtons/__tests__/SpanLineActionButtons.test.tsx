import type { Mock } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { useCopySpanLink } from 'hooks/trace/useCopySpanLink';
import { render } from 'tests/test-utils';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import SpanLineActionButtons from '../index';

// Mock the useCopySpanLink hook
vi.mock('hooks/trace/useCopySpanLink');

const mockSpan: SpanV3 = {
	span_id: 'test-span-id',
	trace_id: 'test-trace-id',
	parent_span_id: 'test-parent-span-id',
	timestamp: 1234567890,
	duration_nano: 1000,
	name: 'test-span',
	'service.name': 'test-service',
	has_error: false,
	status_message: 'test-status-message',
	status_code: 0,
	status_code_string: 'test-status-code-string',
	kind: 0,
	kind_string: 'test-span-kind',
	has_children: false,
	has_sibling: false,
	sub_tree_node_count: 0,
	level: 0,
	attributes: {},
	resource: {},
	events: [],
	http_method: '',
	http_url: '',
	http_host: '',
	db_name: '',
	db_operation: '',
	external_http_method: '',
	external_http_url: '',
	response_status_code: '',
	is_remote: '',
	flags: 0,
	trace_state: '',
};

describe('SpanLineActionButtons', () => {
	beforeEach(() => {
		// Clear mock before each test
		vi.clearAllMocks();
	});

	it('renders copy link button with correct icon', () => {
		(useCopySpanLink as Mock).mockReturnValue({
			onSpanCopy: vi.fn(),
		});

		render(<SpanLineActionButtons span={mockSpan} />);

		// Check if the button is rendered
		const copyButton = screen.getByRole('button');
		expect(copyButton).toBeInTheDocument();

		// Check that an icon is rendered inside the button
		const linkIcon = copyButton.querySelector('svg');
		expect(linkIcon).toBeInTheDocument();
	});

	it('calls onSpanCopy when copy button is clicked', () => {
		const mockOnSpanCopy = vi.fn();
		(useCopySpanLink as Mock).mockReturnValue({
			onSpanCopy: mockOnSpanCopy,
		});

		render(<SpanLineActionButtons span={mockSpan} />);

		// Click the copy button
		const copyButton = screen.getByRole('button');
		fireEvent.click(copyButton);

		// Verify the copy function was called
		expect(mockOnSpanCopy).toHaveBeenCalledTimes(1);
	});

	it('copies span link to clipboard when copy button is clicked', () => {
		const mockSetCopy = vi.fn();
		const mockUrlQuery = {
			delete: vi.fn(),
			set: vi.fn(),
			toString: vi.fn().mockReturnValue('spanId=test-span-id'),
		};
		const mockPathname = '/test-path';
		// No window.location stub: browsers refuse to redefine `location`
		// (§6.5), so build the expectation from the live origin instead.

		// Mock useCopySpanLink hook
		(useCopySpanLink as Mock).mockReturnValue({
			onSpanCopy: (event: React.MouseEvent) => {
				event.preventDefault();
				event.stopPropagation();
				mockUrlQuery.delete('spanId');
				mockUrlQuery.set('spanId', mockSpan.span_id);
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
			`${window.location.origin}/test-path?spanId=test-span-id`,
		);
	});
});
