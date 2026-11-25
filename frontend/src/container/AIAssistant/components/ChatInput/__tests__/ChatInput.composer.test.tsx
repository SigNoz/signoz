import type { ComponentProps } from 'react';
import { render, screen, userEvent } from 'tests/test-utils';

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

	it('lets the user type but not send while sending is blocked', async () => {
		const user = userEvent.setup();
		const onSend = jest.fn() as jest.MockedFunction<
			ComponentProps<typeof ChatInput>['onSend']
		>;
		render(<ChatInput onSend={onSend} sendDisabled />);
		const textarea = screen.getByTestId('ai-chat-input-textarea');

		await user.type(textarea, 'next question{Enter}');

		expect(textarea).toHaveValue('next question');
		expect(onSend).not.toHaveBeenCalled();
	});
});
