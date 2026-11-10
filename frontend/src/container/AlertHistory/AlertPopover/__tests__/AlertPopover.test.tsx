import ROUTES from 'constants/routes';
import { render, screen, userEvent } from 'tests/test-utils';

import { ConditionalAlertPopover } from '../AlertPopover';

const AI_TRACES_LINK = 'compositeQuery=ai&startTime=1&endTime=2';
const TRACES_LINK = 'compositeQuery=traces&startTime=1&endTime=2';

const renderPopover = (links: {
	relatedTracesLink?: string;
	relatedLogsLink?: string;
	relatedAITracesLink?: string;
}): void => {
	render(
		<ConditionalAlertPopover
			relatedTracesLink={links.relatedTracesLink ?? ''}
			relatedLogsLink={links.relatedLogsLink ?? ''}
			relatedAITracesLink={links.relatedAITracesLink ?? ''}
		>
			<button type="button">open</button>
		</ConditionalAlertPopover>,
	);
};

describe('ConditionalAlertPopover', () => {
	it('links an AI traces alert to the AI observability explorer', async () => {
		const user = userEvent.setup();
		renderPopover({ relatedAITracesLink: AI_TRACES_LINK });

		await user.click(screen.getByText('open'));

		const link = await screen.findByTestId('alert-popover-view-ai-traces');
		expect(link).toHaveTextContent('View AI Traces');
		expect(link).toHaveAttribute(
			'href',
			`${ROUTES.AI_OBSERVABILITY_EXPLORER}?${AI_TRACES_LINK}`,
		);
		expect(
			screen.queryByTestId('alert-popover-view-traces'),
		).not.toBeInTheDocument();
	});

	it('keeps traces alerts on the traces explorer', async () => {
		const user = userEvent.setup();
		renderPopover({ relatedTracesLink: TRACES_LINK });

		await user.click(screen.getByText('open'));

		await expect(
			screen.findByTestId('alert-popover-view-traces'),
		).resolves.toHaveAttribute(
			'href',
			`${ROUTES.TRACES_EXPLORER}?${TRACES_LINK}`,
		);
		expect(
			screen.queryByTestId('alert-popover-view-ai-traces'),
		).not.toBeInTheDocument();
	});

	it('renders no popover without any link', async () => {
		const user = userEvent.setup();
		renderPopover({});

		await user.click(screen.getByText('open'));

		expect(
			screen.queryByTestId('alert-popover-view-ai-traces'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('alert-popover-view-traces'),
		).not.toBeInTheDocument();
	});
});
