import {
	type ClarificationEventDTO,
	ClarificationFieldTypeDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import { render, screen, userEvent } from 'tests/test-utils';

import {
	type AIAssistantStore,
	useAIAssistantStore,
} from '../../../store/useAIAssistantStore';
import ClarificationForm from '../ClarificationForm';

const VALIDATION_MESSAGE = 'Clarification field threshold must be a number.';

const CLARIFICATION: ClarificationEventDTO = {
	executionId: 'exec-1',
	clarificationId: 'clar-1',
	message: 'A few details needed',
	fields: [
		{
			id: 'threshold',
			type: ClarificationFieldTypeDTO.text,
			label: 'Threshold',
			required: true,
		},
	],
};

describe('ClarificationForm', () => {
	it('keeps the answers and shows the error inline when submitting fails', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const submitClarification = jest.fn() as jest.MockedFunction<
			AIAssistantStore['submitClarification']
		>;
		submitClarification.mockResolvedValueOnce(VALIDATION_MESSAGE);
		useAIAssistantStore.setState({ submitClarification });
		render(
			<ClarificationForm conversationId="conv-1" clarification={CLARIFICATION} />,
		);

		await user.type(screen.getByLabelText(/threshold/i), 'five');
		await user.click(screen.getByTestId('clarification-submit'));

		await expect(
			screen.findByTestId('clarification-submit-error'),
		).resolves.toHaveTextContent(VALIDATION_MESSAGE);
		expect(screen.getByLabelText(/threshold/i)).toHaveValue('five');
		expect(screen.getByTestId('clarification-submit')).toBeEnabled();
	});
});
