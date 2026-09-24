import { Dispatch, ReactElement, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@signozhq/ui/input';
import { Switch } from '@signozhq/ui/switch';
import { Form, FormInstance, Select } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import type { Store } from 'antd/lib/form/interface';
import ROUTES from 'constants/routes';
import {
	ChannelKind,
	ChannelSpecFormValues,
} from 'container/CreateAlertChannels/types';
import history from 'lib/history';

import EmailSettings from './Settings/Email';
import GoogleChatSettings from './Settings/GoogleChat';
import IncidentIOSettings from './Settings/IncidentIo';
import JiraSettings from './Settings/Jira';
import JsmOpsSettings from './Settings/JsmOps';
import MsTeamsSettings from './Settings/MsTeams';
import OpsgenieSettings from './Settings/Opsgenie';
import PagerSettings from './Settings/Pager';
import SlackSettings from './Settings/Slack';
import WebhookSettings from './Settings/Webhook';
import { Button } from './styles';

function FormAlertChannels({
	formInstance,
	type,
	setSelectedConfig,
	onTypeChangeHandler,
	onTestHandler,
	onSaveHandler,
	savingState,
	testingState,
	title,
	initialValue,
	editing = false,
}: FormAlertChannelsProps): JSX.Element {
	const { t } = useTranslation('channels');

	const renderSettings = (): ReactElement | null => {
		switch (type) {
			case ChannelKind.slack:
				return (
					<SlackSettings
						setSelectedConfig={setSelectedConfig}
						initialFields={initialValue?.fields as ChannelSpecFormValues['fields']}
						initialActions={initialValue?.actions as ChannelSpecFormValues['actions']}
					/>
				);
			case ChannelKind.webhook:
				return <WebhookSettings setSelectedConfig={setSelectedConfig} />;
			case ChannelKind.pagerduty:
				return (
					<PagerSettings
						setSelectedConfig={setSelectedConfig}
						initialDetails={initialValue?.details as Record<string, string>}
					/>
				);
			case ChannelKind.msteams:
				return <MsTeamsSettings setSelectedConfig={setSelectedConfig} />;
			case ChannelKind.googlechat:
				return <GoogleChatSettings setSelectedConfig={setSelectedConfig} />;
			case ChannelKind.jira:
				return <JiraSettings setSelectedConfig={setSelectedConfig} />;
			case ChannelKind.jsmops:
				return <JsmOpsSettings setSelectedConfig={setSelectedConfig} />;
			case ChannelKind.incidentio:
				return (
					<IncidentIOSettings
						setSelectedConfig={setSelectedConfig}
						initialMetadata={initialValue?.metadata as Record<string, string>}
					/>
				);
			case ChannelKind.opsgenie:
				return <OpsgenieSettings setSelectedConfig={setSelectedConfig} />;
			case ChannelKind.email:
				return <EmailSettings setSelectedConfig={setSelectedConfig} />;
			default:
				return null;
		}
	};

	return (
		<>
			<Typography.Title level={4} className="form-alert-channels-title">
				{title}
			</Typography.Title>

			<Form initialValues={initialValue} layout="vertical" form={formInstance}>
				<Form.Item label={t('field_channel_name')} labelAlign="left" name="name">
					<Input
						data-testid="channel-name-textbox"
						disabled={editing}
						onChange={(event): void => {
							setSelectedConfig((state) => ({
								...state,
								name: event.target.value,
							}));
						}}
					/>
				</Form.Item>

				<Form.Item
					label={t('field_send_resolved')}
					labelAlign="left"
					name="sendResolved"
				>
					<Switch
						defaultValue={initialValue?.sendResolved}
						testId="field-send-resolved-checkbox"
						onChange={(value): void => {
							setSelectedConfig((state) => ({
								...state,
								sendResolved: value,
							}));
						}}
					/>
				</Form.Item>

				<Form.Item label={t('field_channel_type')} labelAlign="left" name="type">
					<Select
						disabled={editing}
						onChange={onTypeChangeHandler}
						value={type}
						data-testid="channel-type-select"
					>
						<Select.Option value="slack" key="slack" data-testid="select-option">
							Slack
						</Select.Option>
						<Select.Option value="webhook" key="webhook" data-testid="select-option">
							Webhook
						</Select.Option>
						<Select.Option
							value="pagerduty"
							key="pagerduty"
							data-testid="select-option"
						>
							Pagerduty
						</Select.Option>
						<Select.Option
							value="opsgenie"
							key="opsgenie"
							data-testid="select-option"
						>
							Opsgenie
						</Select.Option>
						<Select.Option value="email" key="email" data-testid="select-option">
							Email
						</Select.Option>

						<Select.Option value="msteams" key="msteams" data-testid="select-option">
							Microsoft Teams
						</Select.Option>

						<Select.Option
							value="googlechat"
							key="googlechat"
							data-testid="select-option"
						>
							Google Chat
						</Select.Option>

						<Select.Option value="jira" key="jira" data-testid="select-option">
							Jira
						</Select.Option>

						<Select.Option value="jsmops" key="jsmops" data-testid="select-option">
							Jira Service Management Ops
						</Select.Option>

						<Select.Option
							value="incidentio"
							key="incidentio"
							data-testid="select-option"
						>
							incident.io
						</Select.Option>
					</Select>
				</Form.Item>

				<Form.Item>{renderSettings()}</Form.Item>

				<Form.Item>
					<Button
						data-testid="save-channel-button"
						disabled={savingState}
						loading={savingState}
						type="primary"
						onClick={(): void => onSaveHandler(type)}
					>
						{t('button_save_channel')}
					</Button>
					<Button
						data-testid="test-channel-button"
						disabled={testingState}
						loading={testingState}
						onClick={(): void => onTestHandler(type)}
					>
						{t('button_test_channel')}
					</Button>
					<Button
						data-testid="return-button"
						onClick={(): void => {
							history.replace(ROUTES.ALL_CHANNELS);
						}}
					>
						{t('button_return')}
					</Button>
				</Form.Item>
			</Form>
		</>
	);
}

interface FormAlertChannelsProps {
	formInstance: FormInstance;
	type: ChannelKind;
	setSelectedConfig: Dispatch<SetStateAction<ChannelSpecFormValues>>;
	onTypeChangeHandler: (value: ChannelKind) => void;
	onSaveHandler: (props: ChannelKind) => void;
	onTestHandler: (props: ChannelKind) => void;
	testingState: boolean;
	savingState: boolean;
	title: string;
	initialValue: Store;
	// editing indicates if the form is opened in edit mode
	editing?: boolean;
}

FormAlertChannels.defaultProps = {
	editing: undefined,
};

export default FormAlertChannels;
