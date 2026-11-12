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
});
