import { render, screen } from 'tests/test-utils';

import ChatInput from '../ChatInput';

describe('ChatInput composer', () => {
	it('asks the user to ask Noz', () => {
		render(<ChatInput onSend={jest.fn()} />);

		expect(screen.getByTestId('ai-chat-input-textarea')).toHaveAttribute(
			'placeholder',
			'Ask Noz…',
		);
	});

	it('focuses the textarea when asked again', () => {
		const { rerender } = render(
			<ChatInput onSend={jest.fn()} focusRequest={0} />,
		);
		const textarea = screen.getByTestId('ai-chat-input-textarea');
		textarea.blur();

		rerender(<ChatInput onSend={jest.fn()} focusRequest={1} />);

		expect(textarea).toHaveFocus();
	});
});
