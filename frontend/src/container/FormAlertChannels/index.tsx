import { Dispatch, ReactElement, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@signozhq/ui/switch';
import { Form, FormInstance, Input } from 'antd';
import { SelectSimple } from '@signozhq/ui/select';
import { Typography } from '@signozhq/ui/typography';
import type { Store } from 'antd/lib/form/interface';
import ROUTES from 'constants/routes';
import {
	ChannelType,
	EmailChannel,
	OpsgenieChannel,
	PagerChannel,
	SlackChannel,
	WebhookChannel,
} from 'container/CreateAlertChannels/config';
import history from 'lib/history';

import EmailSettings from './Settings/Email';
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
			case ChannelType.Slack:
				return <SlackSettings setSelectedConfig={setSelectedConfig} />;
			case ChannelType.Webhook:
				return <WebhookSettings setSelectedConfig={setSelectedConfig} />;
			case ChannelType.Pagerduty:
				return <PagerSettings setSelectedConfig={setSelectedConfig} />;
			case ChannelType.MsTeams:
				return <MsTeamsSettings setSelectedConfig={setSelectedConfig} />;
			case ChannelType.Opsgenie:
				return <OpsgenieSettings setSelectedConfig={setSelectedConfig} />;
			case ChannelType.Email:
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
					name="send_resolved"
				>
					<Switch
						defaultValue={initialValue?.send_resolved}
						testId="field-send-resolved-checkbox"
						onChange={(value): void => {
							setSelectedConfig((state) => ({
								...state,
								send_resolved: value,
							}));
						}}
					/>
				</Form.Item>

				<Form.Item label={t('field_channel_type')} labelAlign="left" name="type">
					<SelectSimple
						disabled={editing}
						onChange={(value): void => onTypeChangeHandler(value as ChannelType)}
						value={type}
						testId="channel-type-select"
						items={[
							{ value: 'slack', label: 'Slack' },
							{ value: 'webhook', label: 'Webhook' },
							{ value: 'pagerduty', label: 'Pagerduty' },
							{ value: 'opsgenie', label: 'Opsgenie' },
							{ value: 'email', label: 'Email' },
							{ value: 'msteams', label: 'Microsoft Teams' },
						]}
					/>
				</Form.Item>

				<Form.Item>{renderSettings()}</Form.Item>

				<Form.Item>
					<Button
						disabled={savingState}
						loading={savingState}
						type="primary"
						onClick={(): void => onSaveHandler(type)}
					>
						{t('button_save_channel')}
					</Button>
					<Button
						disabled={testingState}
						loading={testingState}
						onClick={(): void => onTestHandler(type)}
					>
						{t('button_test_channel')}
					</Button>
					<Button
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
	type: ChannelType;
	setSelectedConfig: Dispatch<
		SetStateAction<
			Partial<
				SlackChannel &
					WebhookChannel &
					PagerChannel &
					OpsgenieChannel &
					EmailChannel
			>
		>
	>;
	onTypeChangeHandler: (value: ChannelType) => void;
	onSaveHandler: (props: ChannelType) => void;
	onTestHandler: (props: ChannelType) => void;
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
