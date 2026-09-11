import React from 'react';
import { render, screen, userEvent } from 'tests/test-utils';
import {
	ErrorCodeDTO,
	RetryActionDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';

import { Message } from '../../../types';

// react-markdown + remark-gfm are ESM-only and pull a large untransformed
// dependency chain into jest. The error-rendering path under test renders
// plain text (no markdown), so stub them to keep the import graph loadable.
jest.mock('react-markdown', () => ({
	__esModule: true,
	default: ({ children }: { children?: React.ReactNode }): React.ReactNode =>
		children,
}));
jest.mock('remark-gfm', () => ({
	__esModule: true,
	default: (): void => undefined,
}));

// eslint-disable-next-line import/first
import MessageBubble from '../MessageBubble';

function errorMessage(overrides: Partial<Message> = {}): Message {
	return {
		id: 'err-1',
		role: 'assistant',
		content: 'This conversation is still finishing a previous response.',
		isError: true,
		errorCode: ErrorCodeDTO.thread_busy,
		retryAction: RetryActionDTO.manual,
		createdAt: 0,
		...overrides,
	};
}

const retryButton = (): HTMLElement | null =>
	screen.queryByRole('button', { name: /retry/i });

describe('MessageBubble — error rendering', () => {
	it('shows a Retry button for a manual error and invokes onRetry on click', async () => {
		const onRetry = jest.fn();
		render(<MessageBubble message={errorMessage()} onRetry={onRetry} />);

		// Error copy is rendered, and the feedback bar is suppressed on errors.
		expect(
			screen.getByText(/still finishing a previous response/i),
		).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /copy message/i }),
		).not.toBeInTheDocument();

		const button = retryButton();
		expect(button).toBeInTheDocument();
		await userEvent.click(button as HTMLElement);
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it('hides the Retry button when retryAction is none', () => {
		render(
			<MessageBubble
				message={errorMessage({ retryAction: RetryActionDTO.none })}
				onRetry={jest.fn()}
			/>,
		);
		expect(retryButton()).not.toBeInTheDocument();
	});

	it('hides the Retry button when retryAction is auto', () => {
		render(
			<MessageBubble
				message={errorMessage({ retryAction: RetryActionDTO.auto })}
				onRetry={jest.fn()}
			/>,
		);
		expect(retryButton()).not.toBeInTheDocument();
	});

	it('hides the Retry button when no onRetry handler is provided', () => {
		render(<MessageBubble message={errorMessage()} />);
		expect(retryButton()).not.toBeInTheDocument();
	});
});
