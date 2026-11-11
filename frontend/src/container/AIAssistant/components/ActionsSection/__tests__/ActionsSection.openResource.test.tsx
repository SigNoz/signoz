import {
	MessageActionDTO,
	MessageActionKindDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import logEvent from 'api/common/logEvent';
import { getCurrentLocation, navigate } from 'lib/router/navigation';
import { act, render, screen, userEvent, waitFor } from 'tests/test-utils';

import { AIAssistantEvents } from '../../../events';
import ActionsSection from '../ActionsSection';

jest.mock('api/common/logEvent');

const mockLogEvent = jest.mocked(logEvent);

const OPEN_ALERT: MessageActionDTO = {
	kind: MessageActionKindDTO.open_resource,
	label: 'Open alert',
	resourceType: 'alert',
	resourceId: 'rule-1',
	actionMetadataId: 'meta-1',
};

const OPEN_ALERT_CHIP = 'ai-action-chip-open_resource';

describe('ActionsSection open_resource', () => {
	beforeEach(() => {
		mockLogEvent.mockClear();
	});

	it.each([
		'/alerts/edit?ruleId=rule-1&tab=1',
		'/alerts/overview?ruleId=rule-1&relativeTime=6h',
	])('disables Open alert while that alert is open at %s', async (route) => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(
			<ActionsSection actions={[OPEN_ALERT]} messageId="message-1" />,
			undefined,
			{ initialRoute: route },
		);

		const chip = screen.getByTestId(OPEN_ALERT_CHIP);
		// With a disabled tooltip the button is aria-disabled so the tooltip stays reachable.
		expect(chip).toHaveAttribute('aria-disabled', 'true');

		await user.click(chip);

		expect(`${getCurrentLocation().pathname}${getCurrentLocation().search}`).toBe(
			route,
		);
		expect(mockLogEvent).not.toHaveBeenCalled();
	});

	it.each(['/alerts/edit?ruleId=rule-2', '/alerts/history?ruleId=rule-1'])(
		'opens the alert from %s',
		async (route) => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(
				<ActionsSection actions={[OPEN_ALERT]} messageId="message-2" />,
				undefined,
				{ initialRoute: route },
			);

			const chip = screen.getByTestId(OPEN_ALERT_CHIP);
			expect(chip).not.toHaveAttribute('aria-disabled', 'true');

			await user.click(chip);

			await waitFor(() =>
				expect(
					`${getCurrentLocation().pathname}${getCurrentLocation().search}`,
				).toBe('/alerts/edit?ruleId=rule-1'),
			);
			expect(mockLogEvent).toHaveBeenCalledWith(
				AIAssistantEvents.ResourceOpened,
				expect.objectContaining({ resourceId: 'rule-1' }),
			);
		},
	);

	it('enables Open alert again after navigating away from that alert', () => {
		render(
			<ActionsSection actions={[OPEN_ALERT]} messageId="message-3" />,
			undefined,
			{ initialRoute: '/alerts/edit?ruleId=rule-1' },
		);
		expect(screen.getByTestId(OPEN_ALERT_CHIP)).toHaveAttribute(
			'aria-disabled',
			'true',
		);

		act(() => navigate('/alerts/edit?ruleId=rule-2'));

		expect(screen.getByTestId(OPEN_ALERT_CHIP)).not.toHaveAttribute(
			'aria-disabled',
			'true',
		);
	});
});
