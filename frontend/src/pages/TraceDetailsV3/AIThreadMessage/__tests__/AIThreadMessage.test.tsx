import { fireEvent, render, screen } from 'tests/test-utils';

import AIThreadMessage from '../AIThreadMessage';
import JsonBlock from '../JsonBlock';
import { MAX_TEXT_LENGTH } from '../utils';

describe('AIThreadMessage', () => {
	it('shows the Output badge when the message has no role', () => {
		render(
			<AIThreadMessage
				message={{ parts: [{ type: 'text', content: 'hi' }] }}
				isOutput
			/>,
		);

		expect(screen.getByTestId('ai-message-output-badge')).toBeInTheDocument();
	});

	it.each([
		['blank text', { type: 'text' as const, content: '  ' }],
		['empty generic', { type: 'generic' as const, content: '' }],
	])('renders No content for a %s part', (_label, part) => {
		render(<AIThreadMessage message={{ role: 'user', parts: [part] }} />);

		expect(screen.getByTestId('ai-message-empty-part')).toHaveTextContent(
			'No content',
		);
	});
});

describe('JsonBlock', () => {
	const big = { value: 'x'.repeat(MAX_TEXT_LENGTH) };

	it('collapses large JSON behind Show more', () => {
		render(<JsonBlock data={big} />);

		const toggle = screen.getByTestId('ai-json-show-more');
		expect(toggle).toHaveTextContent('Show more');
		fireEvent.click(toggle);
		expect(toggle).toHaveTextContent('Show less');
	});

	it('does not collapse small or non-collapsible JSON', () => {
		const { rerender } = render(<JsonBlock data={{ a: 1 }} />);
		expect(screen.queryByTestId('ai-json-show-more')).not.toBeInTheDocument();

		rerender(<JsonBlock data={big} isCollapsible={false} />);
		expect(screen.queryByTestId('ai-json-show-more')).not.toBeInTheDocument();
	});

	it('starts with nested keys collapsed', () => {
		render(<JsonBlock data={{ outer: { inner: 'hidden-value' } }} />);

		expect(screen.getByText(/outer/)).toBeInTheDocument();
		expect(screen.queryByText(/hidden-value/)).not.toBeInTheDocument();
	});

	it('renders a copy button', () => {
		render(<JsonBlock data={{ a: 1 }} />);

		expect(screen.getByTestId('ai-json-copy')).toBeInTheDocument();
	});
});
