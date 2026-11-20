import './__fixtures__/speechRecognitionSupport';

import { render, screen } from 'tests/test-utils';

import ChatInput from '../ChatInput';

describe('ChatInput without voice input', () => {
	it('offers no voice input, even where the browser supports speech', () => {
		render(<ChatInput onSend={jest.fn()} />);

		// The removed mic button never had a test ID, so it is looked up by its label.
		expect(
			screen.queryByRole('button', { name: /voice input/i }),
		).not.toBeInTheDocument();
	});
});
