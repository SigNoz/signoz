import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { clarifyExecution, streamEvents } from 'api/ai-assistant/chat';
import {
	type ClarificationEventDTO,
	ClarificationFieldTypeDTO,
	ErrorCodeDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';

import { useAIAssistantStore } from '../useAIAssistantStore';

jest.mock('api/ai-assistant/chat');

const VALIDATION_MESSAGE = 'Clarification field threshold must be a number.';

const CLARIFICATION: ClarificationEventDTO = {
	executionId: 'exec-1',
	clarificationId: 'clar-1',
	message: 'A few details needed',
	fields: [
		{
			id: 'threshold',
			type: ClarificationFieldTypeDTO.number,
			label: 'Threshold',
			required: true,
		},
	],
};

function validationError(): AxiosError {
	const response = {
		status: 400,
		statusText: 'Bad Request',
		headers: {},
		config: { headers: new AxiosHeaders() },
		data: {
			error: { code: ErrorCodeDTO.validation_error, message: VALIDATION_MESSAGE },
		},
	} as AxiosResponse;
	return new AxiosError('Bad Request', '400', undefined, undefined, response);
}

function startAwaitingClarification(): string {
	const convId = useAIAssistantStore.getState().startNewConversation();
	useAIAssistantStore.setState((s) => {
		s.streams[convId] = {
			isStreaming: false,
			streamingContent: '',
			streamingStatus: 'awaiting_clarification',
			streamingEvents: [],
			streamingMessageId: null,
			streamingActions: null,
			pendingApproval: null,
			pendingClarification: CLARIFICATION,
		};
	});
	return convId;
}

describe('useAIAssistantStore — submitClarification', () => {
	it('keeps the form and returns the backend message when /clarify fails', async () => {
		jest.mocked(clarifyExecution).mockRejectedValueOnce(validationError());
		const convId = startAwaitingClarification();

		const error = await useAIAssistantStore
			.getState()
			.submitClarification(convId, 'clar-1', { threshold: 'abc' });

		expect(error).toBe(VALIDATION_MESSAGE);
		const { streams, conversations } = useAIAssistantStore.getState();
		expect(streams[convId].pendingClarification).toStrictEqual(CLARIFICATION);
		expect(streams[convId].isStreaming).toBe(false);
		expect(conversations[convId].messages).toHaveLength(0);
		expect(streamEvents).not.toHaveBeenCalled();
	});
});
