import EditAlertChannels from 'container/EditAlertChannels';
import {
	editAlertChannelInitialValue,
	editSlackDescriptionDefaultValue,
	slackTitleDefaultValue,
} from 'mocks-server/__mockdata__/alerts';
import { render, screen } from 'tests/test-utils';

import { testLabelInputAndHelpValue } from './testUtils';

const successNotification = jest.fn();
const errorNotification = jest.fn();
jest.mock('hooks/useNotifications', () => ({
	__esModule: true,
	useNotifications: jest.fn(() => ({
		notifications: {
			success: successNotification,
			error: errorNotification,
		},
	})),
}));

describe('Should check if the edit alert channel is properly displayed ', () => {
	beforeEach(() => {
		render(<EditAlertChannels initialValue={editAlertChannelInitialValue} />);
	});
	afterEach(() => {
		jest.clearAllMocks();
	});
	it('Should check if the title is "Edit Notification Channels"', () => {
		expect(screen.getByText('page_title_edit')).toBeInTheDocument();
	});

	it('Should check if the name label and textbox are displayed properly ', () => {
		testLabelInputAndHelpValue({
			labelText: 'field_channel_name',
			testId: 'channel-name-textbox',
			value: 'Dummy-Channel',
		});
	});
	it('Should check if Send resolved alerts label and checkbox are displayed properly and the checkbox is checked ', () => {
		testLabelInputAndHelpValue({
			labelText: 'field_send_resolved',
			testId: 'field-send-resolved-checkbox',
		});
		expect(screen.getByTestId('field-send-resolved-checkbox')).toBeChecked();
	});

	it('Should check if channel type label and dropdown are displayed properly', () => {
		testLabelInputAndHelpValue({
			labelText: 'field_channel_type',
			testId: 'channel-type-select',
		});
	});

	it('Should check if the selected item in the type dropdown has text "Slack"', () => {
		expect(screen.getByText('Slack')).toBeInTheDocument();
	});

	it('Should check if Webhook URL label and input are displayed properly ', () => {
		testLabelInputAndHelpValue({
			labelText: 'field_webhook_url',
			testId: 'webhook-url-textbox',
			value:
				'https://discord.com/api/webhooks/dummy_webhook_id/dummy_webhook_token/slack',
		});
	});

	it('Should check if Recepient label, input, and help text are displayed properly ', () => {
		testLabelInputAndHelpValue({
			labelText: 'field_slack_recipient',
			testId: 'slack-channel-textbox',
			helpText: 'slack_channel_help',
			value: '#dummy_channel',
		});
	});

	it('Should check if Title label and text area are displayed properly ', () => {
		testLabelInputAndHelpValue({
			labelText: 'field_slack_title',
			testId: 'title-textarea',
		});
	});

	it('Should check if Title contains template', () => {
		const titleTextArea = screen.getByTestId('title-textarea');

		expect(titleTextArea).toHaveTextContent(slackTitleDefaultValue);
	});

	it('Should check if Description label and text area are displayed properly ', () => {
		testLabelInputAndHelpValue({
			labelText: 'field_slack_description',
			testId: 'description-textarea',
		});
	});

	it('Should check if Description contains template', () => {
		const descriptionTextArea = screen.getByTestId('description-textarea');

		expect(descriptionTextArea).toHaveTextContent(
			editSlackDescriptionDefaultValue,
		);
	});

	it('Should check if the form buttons are displayed properly (Save, Test, Back)', () => {
		expect(screen.getByText('button_save_channel')).toBeInTheDocument();
		expect(screen.getByText('button_test_channel')).toBeInTheDocument();
		expect(screen.getByText('button_return')).toBeInTheDocument();
	});
});
