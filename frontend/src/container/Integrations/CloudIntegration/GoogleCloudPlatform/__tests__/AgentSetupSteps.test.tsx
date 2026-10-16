import { screen, userEvent } from 'tests/test-utils';

import {
	fillAgentForm,
	renderAgentSetup,
	mockAgentSetupApi,
} from './agentSetupTestHelpers';
import { gcpConnectionCommands } from './mockData';

// `useAgentAccountSetup` imports logEvent by relative path, which the
// jest.config moduleNameMapper (keyed on the `api/common/logEvent` alias) does
// not intercept, so mock the resolved module directly.
jest.mock('../../../../../api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

describe('GCP AgentSetup command steps', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAgentSetupApi();
	});

	it('opens only the first step and walks through the rest with Next', async () => {
		const user = userEvent.setup();
		renderAgentSetup();

		await fillAgentForm(user);
		await user.click(screen.getByTestId('gcp-generate-commands-btn'));
		await screen.findByTestId('gcp-agent-commands');

		const stepToggle = (step: number): HTMLElement =>
			screen.getByTestId(`gcp-agent-step-${step}-toggle`);

		expect(stepToggle(1)).toHaveAttribute('aria-expanded', 'true');
		expect(stepToggle(2)).toHaveAttribute('aria-expanded', 'false');
		expect(stepToggle(3)).toHaveAttribute('aria-expanded', 'false');
		expect(screen.getByTestId('gcp-agent-step-2')).not.toHaveTextContent(
			gcpConnectionCommands.createServiceAccountCommand,
		);

		await user.click(screen.getByTestId('gcp-agent-step-1-next'));

		expect(stepToggle(1)).toHaveAttribute('aria-expanded', 'false');
		expect(screen.getByTestId('gcp-agent-step-2')).toHaveTextContent(
			gcpConnectionCommands.createServiceAccountCommand,
		);

		await user.click(screen.getByTestId('gcp-agent-step-2-next'));

		expect(stepToggle(2)).toHaveAttribute('aria-expanded', 'false');
		expect(screen.getByTestId('gcp-agent-step-3')).toHaveTextContent(
			gcpConnectionCommands.cliCommand,
		);
		expect(screen.queryByTestId('gcp-agent-step-3-next')).not.toBeInTheDocument();
	});

	it('lets any step be expanded or collapsed directly', async () => {
		const user = userEvent.setup();
		renderAgentSetup();

		await fillAgentForm(user);
		await user.click(screen.getByTestId('gcp-generate-commands-btn'));
		await screen.findByTestId('gcp-agent-commands');

		await user.click(screen.getByTestId('gcp-agent-step-3-toggle'));
		expect(screen.getByTestId('gcp-agent-step-3')).toHaveTextContent(
			gcpConnectionCommands.cliCommand,
		);
		expect(screen.getByTestId('gcp-agent-step-1')).toHaveTextContent(
			gcpConnectionCommands.createSecretsCommand,
		);

		await user.click(screen.getByTestId('gcp-agent-step-1-toggle'));
		expect(screen.getByTestId('gcp-agent-step-1')).not.toHaveTextContent(
			gcpConnectionCommands.createSecretsCommand,
		);
	});
});
