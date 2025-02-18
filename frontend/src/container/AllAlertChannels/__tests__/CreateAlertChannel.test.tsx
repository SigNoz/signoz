/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable sonarjs/no-identical-functions */

import CreateAlertChannels from 'container/CreateAlertChannels';
import { ChannelType } from 'container/CreateAlertChannels/config';
import {
	opsGenieDescriptionDefaultValue,
	opsGenieMessageDefaultValue,
	opsGeniePriorityDefaultValue,
	pagerDutyAdditionalDetailsDefaultValue,
	pagerDutyDescriptionDefaultVaule,
	pagerDutySeverityTextDefaultValue,
	slackDescriptionDefaultValue,
	slackTitleDefaultValue,
} from 'mocks-server/__mockdata__/alerts';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { fireEvent, render, screen, waitFor } from 'tests/test-utils';

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

describe('Create Alert Channel', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});
	describe('Should check if the new alert channel is properly displayed with the cascading fields of slack channel ', () => {
		beforeEach(() => {
			render(<CreateAlertChannels preType={ChannelType.Slack} />);
		});
		afterEach(() => {
			jest.clearAllMocks();
		});
		it('Should check if the title is "New Notification Channels"', () => {
			expect(screen.getByText('page_title_create')).toBeInTheDocument();
		});
		it('Should check if the name label and textbox are displayed properly ', () => {
			testLabelInputAndHelpValue({
				labelText: 'field_channel_name',
				testId: 'channel-name-textbox',
			});
		});
		it('Should check if Send resolved alerts label and checkbox are displayed properly ', () => {
			testLabelInputAndHelpValue({
				labelText: 'field_send_resolved',
				testId: 'field-send-resolved-checkbox',
			});
		});
		it('Should check if channel type label and dropdown are displayed properly', () => {
			testLabelInputAndHelpValue({
				labelText: 'field_channel_type',
				testId: 'channel-type-select',
			});
		});
		// Default Channel type (Slack) fields
		it('Should check if the selected item in the type dropdown has text "Slack"', () => {
			expect(screen.getByText('Slack')).toBeInTheDocument();
		});
		it('Should check if Webhook URL label and input are displayed properly ', () => {
			testLabelInputAndHelpValue({
				labelText: 'field_webhook_url',
				testId: 'webhook-url-textbox',
			});
		});
		it('Should check if Recepient label, input, and help text are displayed properly ', () => {
			testLabelInputAndHelpValue({
				labelText: 'field_slack_recipient',
				testId: 'slack-channel-textbox',
				helpText: 'slack_channel_help',
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

			expect(descriptionTextArea).toHaveTextContent(slackDescriptionDefaultValue);
		});
		it('Should check if the form buttons are displayed properly (Save, Test, Back)', () => {
			expect(screen.getByText('button_save_channel')).toBeInTheDocument();
			expect(screen.getByText('button_test_channel')).toBeInTheDocument();
			expect(screen.getByText('button_return')).toBeInTheDocument();
		});
		it('Should check if saving the form without filling the name displays "Something went wrong"', async () => {
			const saveButton = screen.getByRole('button', {
				name: 'button_save_channel',
			});

			fireEvent.click(saveButton);

			await waitFor(() =>
				expect(errorNotification).toHaveBeenCalledWith({
					description: 'Something went wrong',
					message: 'Error',
				}),
			);
		});
		it('Should check if clicking on Test button shows "An alert has been sent to this channel" success message if testing passes', async () => {
			server.use(
				rest.post('http://localhost/api/v1/testChannel', (req, res, ctx) =>
					res(
						ctx.status(200),
						ctx.json({
							status: 'success',
							data: 'test alert sent',
						}),
					),
				),
			);
			const testButton = screen.getByRole('button', {
				name: 'button_test_channel',
			});

			fireEvent.click(testButton);

			await waitFor(() =>
				expect(successNotification).toHaveBeenCalledWith({
					message: 'Success',
					description: 'channel_test_done',
				}),
			);
		});
		it('Should check if clicking on Test button shows "Something went wrong" error message if testing fails', async () => {
			const testButton = screen.getByRole('button', {
				name: 'button_test_channel',
			});

			fireEvent.click(testButton);

			await waitFor(() =>
				expect(errorNotification).toHaveBeenCalledWith({
					message: 'Error',
					description: 'channel_test_failed',
				}),
			);
		});
	});
	describe('New Alert Channel Cascading Fields Based on Channel Type', () => {
		describe('Webhook', () => {
			beforeEach(() => {
				render(<CreateAlertChannels preType={ChannelType.Webhook} />);
			});

			it('Should check if the selected item in the type dropdown has text "Webhook"', () => {
				expect(screen.getByText('Webhook')).toBeInTheDocument();
			});
			it('Should check if Webhook URL label and input are displayed properly ', () => {
				testLabelInputAndHelpValue({
					labelText: 'field_webhook_url',
					testId: 'webhook-url-textbox',
				});
			});
			it('Should check if Webhook User Name label, input, and help text are displayed properly ', () => {
				testLabelInputAndHelpValue({
					labelText: 'field_webhook_username',
					testId: 'webhook-username-textbox',
					helpText: 'help_webhook_username',
				});
			});
			it('Should check if Password label and textbox, and help text are displayed properly', () => {
				testLabelInputAndHelpValue({
					labelText: 'Password (optional)',
					testId: 'webhook-password-textbox',
					helpText: 'help_webhook_password',
				});
			});
		});
		describe('PagerDuty', () => {
			beforeEach(() => {
				render(<CreateAlertChannels preType={ChannelType.Pagerduty} />);
			});

			it('Should check if the selected item in the type dropdown has text "Pagerduty"', () => {
				expect(screen.getByText('Pagerduty')).toBeInTheDocument();
			});
			it('Should check if Routing key label, required, and textbox are displayed properly', () => {
				testLabelInputAndHelpValue({
					labelText: 'field_pager_routing_key',
					testId: 'pager-routing-key-textbox',
				});
			});
			it('Should check if Description label, required, info (Shows up as description in pagerduty), and text area are displayed properly', () => {
				testLabelInputAndHelpValue({
					labelText: 'field_pager_description',
					testId: 'pager-description-textarea',
					helpText: 'help_pager_description',
				});
			});
			it('Should check if the description contains default template', () => {
				const descriptionTextArea = screen.getByTestId(
					'pager-description-textarea',
				);

				expect(descriptionTextArea).toHaveTextContent(
					pagerDutyDescriptionDefaultVaule,
				);
			});
			it('Should check if Severity label, info (help_pager_severity), and textbox are displayed properly', () => {
				testLabelInputAndHelpValue({
					labelText: 'field_pager_severity',
					testId: 'pager-severity-textbox',
					helpText: 'help_pager_severity',
				});
			});
			it('Should check if Severity contains the default template', () => {
				const severityTextbox = screen.getByTestId('pager-severity-textbox');

				expect(severityTextbox).toHaveValue(pagerDutySeverityTextDefaultValue);
			});
			it('Should check if Additional Information label, text area, and help text (help_pager_details) are displayed properly', () => {
				testLabelInputAndHelpValue({
					labelText: 'field_pager_details',
					testId: 'pager-additional-details-textarea',
					helpText: 'help_pager_details',
				});
			});
			it('Should check if Additional Information contains the default template', () => {
				const detailsTextArea = screen.getByTestId(
					'pager-additional-details-textarea',
				);

				expect(detailsTextArea).toHaveValue(pagerDutyAdditionalDetailsDefaultValue);
			});
			it('Should check if Group label, text area, and info (help_pager_group) are displayed properly', () => {
				testLabelInputAndHelpValue({
					labelText: 'field_pager_group',
					testId: 'pager-group-textarea',
					helpText: 'help_pager_group',
				});
			});
			it('Should check if Class label, text area, and info (help_pager_class) are displayed properly', () => {
				testLabelInputAndHelpValue({
					labelText: 'field_pager_class',
					testId: 'pager-class-textarea',
					helpText: 'help_pager_class',
				});
			});
			it('Should check if Client label, text area, and info (Shows up as event source in Pagerduty) are displayed properly', () => {
				testLabelInputAndHelpValue({
					labelText: 'field_pager_client',
					testId: 'pager-client-textarea',
					helpText: 'help_pager_client',
				});
			});
			it('Should check if Client input contains the default value "SigNoz Alert Manager"', () => {
				const clientTextArea = screen.getByTestId('pager-client-textarea');

				expect(clientTextArea).toHaveValue('SigNoz Alert Manager');
			});
			it('Should check if Client URL label, text area, and info (Shows up as event source link in Pagerduty) are displayed properly', () => {
				testLabelInputAndHelpValue({
					labelText: 'field_pager_client_url',
					testId: 'pager-client-url-textarea',
					helpText: 'help_pager_client_url',
				});
			});
			it('Should check if Client URL contains the default value "https://enter-signoz-host-n-port-here/alerts"', () => {
				const clientUrlTextArea = screen.getByTestId('pager-client-url-textarea');

				expect(clientUrlTextArea).toHaveValue(
					'https://enter-signoz-host-n-port-here/alerts',
				);
			});
		});
		describe('Opsgenie', () => {
			beforeEach(() => {
				render(<CreateAlertChannels preType={ChannelType.Opsgenie} />);
			});

			it('Should check if the selected item in the type dropdown has text "Opsgenie"', () => {
				expect(screen.getByText('Opsgenie')).toBeInTheDocument();
			});

			it('Should check if API key label, required, and textbox are displayed properly', () => {
				testLabelInputAndHelpValue({
					labelText: 'field_opsgenie_api_key',
					testId: 'opsgenie-api-key-textbox',
					required: true,
				});
			});

			it('Should check if Message label, required, info (Shows up as message in opsgenie), and text area are displayed properly', () => {
				testLabelInputAndHelpValue({
					labelText: 'field_opsgenie_message',
					testId: 'opsgenie-message-textarea',
					helpText: 'help_opsgenie_message',
					required: true,
				});
			});

			it('Should check if Message contains the default template ', () => {
				const messageTextArea = screen.getByTestId('opsgenie-message-textarea');

				expect(messageTextArea).toHaveValue(opsGenieMessageDefaultValue);
			});

			it('Should check if Description label, required, info (Shows up as description in opsgenie), and text area are displayed properly `{{ if gt (len .Alerts.Firing) 0 -}}', () => {
				testLabelInputAndHelpValue({
					labelText: 'field_opsgenie_description',
					testId: 'opsgenie-description-textarea',
					helpText: 'help_opsgenie_description',
					required: true,
				});
			});

			it('Should check if Description label, required, info (Shows up as description in opsgenie), and text area are displayed properly `{{ if gt (len .Alerts.Firing) 0 -}}', () => {
				const descriptionTextArea = screen.getByTestId(
					'opsgenie-description-textarea',
				);

				expect(descriptionTextArea).toHaveTextContent(
					opsGenieDescriptionDefaultValue,
				);
			});

			it('Should check if Priority label, required, info (help_opsgenie_priority), and text area are displayed properly', () => {
				testLabelInputAndHelpValue({
					labelText: 'field_opsgenie_priority',
					testId: 'opsgenie-priority-textarea',
					helpText: 'help_opsgenie_priority',
					required: true,
				});
			});

			it('Should check if Message contains the default template', () => {
				const priorityTextArea = screen.getByTestId('opsgenie-priority-textarea');

				expect(priorityTextArea).toHaveValue(opsGeniePriorityDefaultValue);
			});
		});
		describe('Email', () => {
			beforeEach(() => {
				render(<CreateAlertChannels preType={ChannelType.Email} />);
			});

			it('Should check if the selected item in the type dropdown has text "Email"', () => {
				expect(screen.getByText('Email')).toBeInTheDocument();
			});
			it('Should check if API key label, required, info(help_email_to), and textbox are displayed properly', () => {
				testLabelInputAndHelpValue({
					labelText: 'field_email_to',
					testId: 'email-to-textbox',
					helpText: 'help_email_to',
					required: true,
				});
			});
		});
		describe('Microsoft Teams', () => {
			beforeEach(() => {
				render(<CreateAlertChannels preType={ChannelType.MsTeams} />);
			});

			it('Should check if the selected item in the type dropdown has text "msteams"', () => {
				expect(
					screen.getByText('Microsoft Teams (Supported in Paid Plans Only)'),
				).toBeInTheDocument();
			});

			it('Should check if Webhook URL label and input are displayed properly ', () => {
				testLabelInputAndHelpValue({
					labelText: 'field_webhook_url',
					testId: 'webhook-url-textbox',
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

				expect(descriptionTextArea).toHaveTextContent(slackDescriptionDefaultValue);
			});
		});
	});
});
