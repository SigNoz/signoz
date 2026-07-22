import { rest, server } from 'mocks-server/server';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { mockUseAuthZGrantAll } from 'lib/authz/utils/authz-test-utils';
import { render, screen, userEvent } from 'tests/test-utils';

// Monaco can't run in jsdom (it needs web workers), so swap it for a plain
// textarea. TestTab reads its span JSON from React state (default
// SAMPLE_SPAN_JSON), not from the editor DOM, so the stand-in doesn't affect
// the run — it just lets the tab mount.
jest.mock('@monaco-editor/react', () => ({
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

// The header + editing controls are Admin-gated via useAuthZ; grant all.
jest.mock('lib/authz/hooks/useAuthZ/useAuthZ');
const mockedUseAuthZ = useAuthZ as jest.MockedFunction<typeof useAuthZ>;

import LLMObservabilityAttributeMapping from '../../LLMObservabilityAttributeMapping';
import {
	GROUPS_ENDPOINT,
	makeGroupsResponse,
	makeTestResponse,
	mockGroups,
	TEST_ENDPOINT,
} from '../../__tests__/fixtures';

// A transformed span as the backend would return it: every attribute from the
// submitted sample span is unchanged except `gen_ai.content.prompt`, which the
// mapper populated from a source key — so the diff marks it "added".
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

describe('TestTab — sample-span flow', () => {
	beforeEach(() => {
		window.history.pushState(null, '', '/');
		server.use(
			rest.get(GROUPS_ENDPOINT, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(makeGroupsResponse(mockGroups))),
			),
		);
		mockedUseAuthZ.mockImplementation(mockUseAuthZGrantAll);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('runs the sample span through the mappers and renders the populated result', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		server.use(
			rest.post(TEST_ENDPOINT, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(makeTestResponse([RESULT_SPAN]))),
			),
		);

		render(<LLMObservabilityAttributeMapping />);

		// Switch to the Test tab; before running, only the placeholder shows.
		await user.click(screen.getByRole('tab', { name: 'Test' }));
		const runBtn = await screen.findByTestId('run-test-button');
		expect(screen.getByTestId('test-results-placeholder')).toBeInTheDocument();

		await user.click(runBtn);

		// The mocked response renders as a result card, and the mapper-populated
		// attribute surfaces as an "added" ("populated") row.
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
});
