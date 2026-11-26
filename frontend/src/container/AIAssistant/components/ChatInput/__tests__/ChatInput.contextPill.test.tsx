import type { ComponentProps } from 'react';
import type { MessageContext } from 'api/ai-assistant/chat';
import { render, screen, userEvent } from 'tests/test-utils';

import ChatInput from '../ChatInput';

const serviceContext: MessageContext = {
	source: 'auto',
	type: 'service',
	resourceId: 'checkout',
};

describe('ChatInput — context pills', () => {
	it('names a page context by its type and drops it on remove', async () => {
		const user = userEvent.setup();
		const onDismissAutoContext = jest.fn() as jest.MockedFunction<
			NonNullable<ComponentProps<typeof ChatInput>['onDismissAutoContext']>
		>;
		render(
			<ChatInput
				onSend={jest.fn()}
				autoContexts={[serviceContext]}
				onDismissAutoContext={onDismissAutoContext}
			/>,
		);

		expect(screen.getByTestId('ai-context-pill')).toHaveTextContent(
			'Service :checkout',
		);

		await user.click(screen.getByTestId('ai-context-pill-remove'));

		expect(onDismissAutoContext).toHaveBeenCalledWith('auto:service:checkout:');
	});
});
