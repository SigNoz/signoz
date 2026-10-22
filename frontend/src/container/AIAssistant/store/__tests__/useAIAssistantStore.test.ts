import {
	ErrorCodeDTO,
	RetryActionDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import type { SSEEvent } from 'api/ai-assistant/chat';

import { useAIAssistantStore } from '../useAIAssistantStore';
import type { Message } from '../../types';

// The store talks to the chat API only through these named exports. Mock the
// whole module so we can drive the SSE stream + REST calls deterministically.
jest.mock('api/ai-assistant/chat', () => ({
	__esModule: true,
	createThread: jest.fn(),
	sendMessage: jest.fn(),
	streamEvents: jest.fn(),
	approveExecution: jest.fn(),
	clarifyExecution: jest.fn(),
	regenerateMessage: jest.fn(),
	rejectExecution: jest.fn(),
	cancelExecution: jest.fn(),
	listThreads: jest.fn(),
	getThreadDetail: jest.fn(),
	updateThread: jest.fn(),
	submitFeedback: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
const chat = jest.requireMock('api/ai-assistant/chat') as Record<
	string,
	jest.Mock
>;

// Builds a single-use async stream from a fixed list of SSE events.
async function* eventStream(events: SSEEvent[]): AsyncGenerator<SSEEvent> {
	for (const event of events) {
		yield event;
	}
}

function errorEvent(
	executionId: string,
	code: ErrorCodeDTO,
	retryAction: RetryActionDTO,
): SSEEvent {
	return {
		type: 'error',
		executionId,
		error: { code, message: 'backend message' },
		retryAction,
	};
}

function lastMessage(conversationId: string): Message {
	const conv = useAIAssistantStore.getState().conversations[conversationId];
	return conv.messages[conv.messages.length - 1];
}

describe('useAIAssistantStore — streaming error handling', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useAIAssistantStore.setState((s) => {
			s.conversations = {};
			s.streams = {};
			s.activeConversationId = null;
		});
	});

	it('commits a manually-retryable error bubble with friendly copy and metadata', async () => {
		chat.createThread.mockResolvedValue('thread-1');
		chat.sendMessage.mockResolvedValue('exec-1');
		chat.streamEvents.mockReturnValueOnce(
			eventStream([
				errorEvent('exec-1', ErrorCodeDTO.thread_busy, RetryActionDTO.manual),
			]),
		);

		useAIAssistantStore.getState().startNewConversation();
		await useAIAssistantStore.getState().sendMessage('hello');

		const conv = useAIAssistantStore.getState().conversations['thread-1'];
		expect(conv.messages).toHaveLength(2);
		expect(conv.messages[0]).toMatchObject({ role: 'user', content: 'hello' });
		expect(conv.messages[1]).toMatchObject({
			role: 'assistant',
			isError: true,
			errorCode: ErrorCodeDTO.thread_busy,
			retryAction: RetryActionDTO.manual,
		});
		// Code-specific FE copy, not the raw backend message.
		expect(conv.messages[1].content).toContain(
			'still finishing a previous response',
		);
	});

	it('replays the send on retry without re-pushing the user message', async () => {
		chat.createThread.mockResolvedValue('thread-1');
		chat.sendMessage.mockResolvedValue('exec-1');
		chat.streamEvents.mockReturnValueOnce(
			eventStream([
				errorEvent('exec-1', ErrorCodeDTO.thread_busy, RetryActionDTO.manual),
			]),
		);

		useAIAssistantStore.getState().startNewConversation();
		await useAIAssistantStore.getState().sendMessage('hello');

		// The retry succeeds this time.
		chat.streamEvents.mockReturnValueOnce(
			eventStream([
				{
					type: 'message',
					executionId: 'exec-1',
					messageId: 'm1',
					delta: 'Hi there',
					done: true,
				},
			]),
		);

		await useAIAssistantStore.getState().retryAssistantMessage('thread-1');

		const conv = useAIAssistantStore.getState().conversations['thread-1'];
		// Error bubble replaced by the assistant reply; the user message stays.
		expect(conv.messages).toHaveLength(2);
		expect(conv.messages[0]).toMatchObject({ role: 'user', content: 'hello' });
		expect(conv.messages[1]).toMatchObject({
			role: 'assistant',
			content: 'Hi there',
		});
		expect(conv.messages[1].isError).toBeUndefined();
		// Thread already existed on retry; the user message was never re-sent as new.
		expect(chat.createThread).toHaveBeenCalledTimes(1);
		expect(chat.sendMessage).toHaveBeenCalledTimes(2);
	});

	it('silently retries auto-flagged errors, then downgrades to manual once spent', async () => {
		chat.createThread.mockResolvedValue('thread-2');
		chat.sendMessage.mockResolvedValue('exec');
		// Always auto-retryable: 1 initial attempt + MAX_AUTO_RETRIES (2) = 3 sends.
		chat.streamEvents.mockImplementation(() =>
			eventStream([
				errorEvent('exec', ErrorCodeDTO.internal_error, RetryActionDTO.auto),
			]),
		);

		useAIAssistantStore.getState().startNewConversation();
		await useAIAssistantStore.getState().sendMessage('hi');

		expect(chat.sendMessage).toHaveBeenCalledTimes(3);
		expect(lastMessage('thread-2')).toMatchObject({
			isError: true,
			errorCode: ErrorCodeDTO.internal_error,
			// Auto budget exhausted → presented as manual so a Retry button shows.
			retryAction: RetryActionDTO.manual,
		});
	}, 10000);

	it('marks rate-limit errors and offers no retry', async () => {
		chat.createThread.mockResolvedValue('thread-3');
		chat.sendMessage.mockResolvedValue('exec');
		chat.streamEvents.mockReturnValueOnce(
			eventStream([
				errorEvent('exec', ErrorCodeDTO.hourly_message_limit, RetryActionDTO.none),
			]),
		);

		useAIAssistantStore.getState().startNewConversation();
		await useAIAssistantStore.getState().sendMessage('hi');

		expect(lastMessage('thread-3')).toMatchObject({
			isError: true,
			isRateLimitError: true,
			retryAction: RetryActionDTO.none,
		});

		// No retry thunk registered for a non-retryable error — retry is a no-op.
		const before =
			useAIAssistantStore.getState().conversations['thread-3'].messages.length;
		await useAIAssistantStore.getState().retryAssistantMessage('thread-3');
		expect(
			useAIAssistantStore.getState().conversations['thread-3'].messages,
		).toHaveLength(before);
	});

	it('recovers silently when an auto-flagged error succeeds on retry', async () => {
		chat.createThread.mockResolvedValue('thread-4');
		chat.sendMessage.mockResolvedValue('exec');
		chat.streamEvents
			.mockReturnValueOnce(
				eventStream([
					errorEvent('exec', ErrorCodeDTO.internal_error, RetryActionDTO.auto),
				]),
			)
			.mockReturnValueOnce(
				eventStream([
					{
						type: 'message',
						executionId: 'exec',
						messageId: 'm1',
						delta: 'Recovered',
						done: true,
					},
				]),
			);

		useAIAssistantStore.getState().startNewConversation();
		await useAIAssistantStore.getState().sendMessage('hi');

		// 1 initial attempt + 1 silent auto retry, then success — no error bubble.
		expect(chat.sendMessage).toHaveBeenCalledTimes(2);
		const conv = useAIAssistantStore.getState().conversations['thread-4'];
		expect(conv.messages).toHaveLength(2);
		expect(conv.messages[0]).toMatchObject({ role: 'user', content: 'hi' });
		expect(conv.messages[1]).toMatchObject({
			role: 'assistant',
			content: 'Recovered',
		});
		expect(conv.messages.some((m) => m.isError)).toBe(false);
	}, 10000);

	it('replays the originating action on retry for a non-send error (approve)', async () => {
		chat.approveExecution.mockResolvedValue('exec-a');
		chat.streamEvents.mockReturnValueOnce(
			eventStream([
				errorEvent('exec-a', ErrorCodeDTO.thread_busy, RetryActionDTO.manual),
			]),
		);

		const convId = useAIAssistantStore.getState().startNewConversation();
		await useAIAssistantStore.getState().approveAction(convId, 'approval-1');

		expect(lastMessage(convId)).toMatchObject({
			isError: true,
			retryAction: RetryActionDTO.manual,
		});
		expect(chat.approveExecution).toHaveBeenCalledTimes(1);

		// Retry replays the approval (not a send) and succeeds this time.
		chat.streamEvents.mockReturnValueOnce(
			eventStream([
				{
					type: 'message',
					executionId: 'exec-a',
					messageId: 'm1',
					delta: 'Approved',
					done: true,
				},
			]),
		);
		await useAIAssistantStore.getState().retryAssistantMessage(convId);

		const conv = useAIAssistantStore.getState().conversations[convId];
		expect(conv.messages).toHaveLength(1);
		expect(conv.messages[0]).toMatchObject({
			role: 'assistant',
			content: 'Approved',
		});
		expect(conv.messages[0].isError).toBeUndefined();
		expect(chat.approveExecution).toHaveBeenCalledTimes(2);
		expect(chat.sendMessage).not.toHaveBeenCalled();
	});
});
