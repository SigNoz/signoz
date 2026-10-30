import { render, screen, userEvent } from 'tests/test-utils';

import ChatInput from '../ChatInput';

function getComposer(): HTMLTextAreaElement {
	return screen.getByPlaceholderText(/Ask anything/i) as HTMLTextAreaElement;
}

describe('ChatInput — @ mention trigger', () => {
	it('opens the context picker when @ starts a word', async () => {
		render(<ChatInput onSend={jest.fn()} />);

		await userEvent.type(getComposer(), 'check @');

		await expect(
			screen.findByPlaceholderText(/search dashboards/i),
		).resolves.toBeInTheDocument();
	});

	it('keeps typing an email without opening the context picker', async () => {
		render(<ChatInput onSend={jest.fn()} />);

		await userEvent.type(getComposer(), 'mail user@example.com');

		expect(getComposer()).toHaveValue('mail user@example.com');
		expect(
			screen.queryByPlaceholderText(/search dashboards/i),
		).not.toBeInTheDocument();
	});
});
