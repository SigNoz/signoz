import { rest, server } from 'mocks-server/server';
import get from 'api/browser/localstorage/get';
import remove from 'api/browser/localstorage/remove';
import set from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { mockUseAuthZGrantAll } from 'lib/authz/utils/authz-test-utils';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

jest.mock('components/MonacoEditor/MonacoEditor', () => ({
	__esModule: true,
	default: ({
		value,
		onChange,
	}: {
		value: string;
		onChange: (next?: string) => void;
	}): JSX.Element => (
		<textarea
			aria-label="json-editor"
			data-testid="monaco"
			value={value}
			onChange={(e): void => onChange(e.target.value)}
		/>
	),
}));

jest.mock('lib/authz/hooks/useAuthZ/useAuthZ');
const mockedUseAuthZ = useAuthZ as jest.MockedFunction<typeof useAuthZ>;

import LLMObservabilityAttributeMapping from '../../LLMObservabilityAttributeMapping';
import { SAMPLE_SPAN_JSON } from '../spanInputStorage';
import {
	GROUPS_ENDPOINT,
	makeGroupsResponse,
	makeTestResponse,
	mockGroups,
	TEST_ENDPOINT,
} from '../../__tests__/fixtures';

const RESULT_SPAN = {
	attributes: {
		'my_company.llm.input': 'What is quantum computing?',
		'llm.input_messages': 'What is quantum computing?',
		'gen_ai.request.model': 'gpt-4',
		'gen_ai.usage.total_tokens': 1250,
		'gen_ai.content.completion': 'Quantum computing leverages...',
		'gen_ai.content.prompt': 'What is quantum computing?',
	},
	resource: {
		'service.name': 'llm-gateway',
		'deployment.environment': 'production',
	},
};

const EDITED_SPAN_JSON = `{
  "attributes": {
    "gen_ai.request.model": "claude-opus-5"
  },
  "resource": {
    "service.name": "my-edited-gateway"
  }
}`;

const SPAN_INPUT_KEY = LOCALSTORAGE.LLM_ATTRIBUTE_MAPPING_TEST_SPAN;

describe('TestTab — sample-span flow', () => {
	beforeEach(() => {
		window.history.pushState(null, '', '/');
		remove(SPAN_INPUT_KEY);
		server.use(
			rest.get(GROUPS_ENDPOINT, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(makeGroupsResponse(mockGroups))),
			),
		);
		mockedUseAuthZ.mockImplementation(mockUseAuthZGrantAll);
	});

	it('runs the sample span through the mappers and renders the populated result', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		server.use(
			rest.post(TEST_ENDPOINT, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(makeTestResponse([RESULT_SPAN]))),
			),
		);

		render(<LLMObservabilityAttributeMapping />);

		await user.click(screen.getByRole('tab', { name: 'Test' }));
		const runBtn = await screen.findByTestId('run-test-button');
		expect(screen.getByTestId('test-results-placeholder')).toBeInTheDocument();

		await user.click(runBtn);

		await expect(
			screen.findByTestId('test-results'),
		).resolves.toBeInTheDocument();
		expect(screen.getByTestId('test-result-0')).toBeInTheDocument();
		expect(screen.getByTestId('test-result-0-attributes')).toHaveTextContent(
			'gen_ai.content.prompt',
		);
		expect(screen.getByText('populated')).toBeInTheDocument();
		expect(screen.queryByTestId('test-error')).not.toBeInTheDocument();
	});

	it('surfaces a backend error and renders no results', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		server.use(
			rest.post(TEST_ENDPOINT, (_req, res, ctx) =>
				res(
					ctx.status(500),
					ctx.json({ error: { message: 'span mapper test failed' } }),
				),
			),
		);

		render(<LLMObservabilityAttributeMapping />);

		await user.click(screen.getByRole('tab', { name: 'Test' }));
		await user.click(await screen.findByTestId('run-test-button'));

		await expect(screen.findByTestId('test-error')).resolves.toHaveTextContent(
			'span mapper test failed',
		);
		expect(screen.queryByTestId('test-results')).not.toBeInTheDocument();
	});

	it('persists an edited span to local storage and restores it on remount', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const { unmount } = render(<LLMObservabilityAttributeMapping />);

		await user.click(screen.getByRole('tab', { name: 'Test' }));
		await screen.findByTestId('run-test-button');

		const editor = screen.getByTestId('monaco');
		expect(editor).toHaveValue(SAMPLE_SPAN_JSON);

		await user.clear(editor);
		await user.paste(EDITED_SPAN_JSON);

		await waitFor(() => expect(get(SPAN_INPUT_KEY)).toBe(EDITED_SPAN_JSON), {
			timeout: 2000,
		});

		unmount();
		render(<LLMObservabilityAttributeMapping />);

		await user.click(screen.getByRole('tab', { name: 'Test' }));
		await screen.findByTestId('run-test-button');
		expect(screen.getByTestId('monaco')).toHaveValue(EDITED_SPAN_JSON);
	});

	it('resets to the sample span and clears the persisted input', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		set(SPAN_INPUT_KEY, EDITED_SPAN_JSON);

		render(<LLMObservabilityAttributeMapping />);

		await user.click(screen.getByRole('tab', { name: 'Test' }));
		const resetBtn = await screen.findByTestId('reset-template-button');

		expect(screen.getByTestId('monaco')).toHaveValue(EDITED_SPAN_JSON);
		expect(resetBtn).toBeEnabled();

		await user.click(resetBtn);

		expect(screen.getByTestId('monaco')).toHaveValue(SAMPLE_SPAN_JSON);
		expect(get(SPAN_INPUT_KEY)).toBeFalsy();
		expect(resetBtn).toBeDisabled();
	});
});
