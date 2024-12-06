import { Form, FormInstance, Input, Select, Switch, Typography } from 'antd';
import { Store } from 'antd/lib/form/interface';
import UpgradePrompt from 'components/Upgrade/UpgradePrompt';
import { FeatureKeys } from 'constants/features';
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
import { useAppContext } from 'providers/App/App';
import { Dispatch, ReactElement, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { isFeatureKeys } from 'utils/app';

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
	const { featureFlags } = useAppContext();
	const isUserOnEEPlan =
		featureFlags?.find((flag) => flag.name === FeatureKeys.ENTERPRISE_PLAN)
			?.active || false;

	const feature = `ALERT_CHANNEL_${type.toUpperCase()}`;

	const featureKey = isFeatureKeys(feature)
		? feature
		: FeatureKeys.ALERT_CHANNEL_SLACK;
	const hasFeature = featureFlags?.find((flag) => flag.name === featureKey);

	const isOssFeature = featureFlags?.find(
		(flag) => flag.name === FeatureKeys.OSS,
	);

	const renderSettings = (): ReactElement | null => {
		if (
			// for ee plan
			!isOssFeature?.active &&
			(!hasFeature || !hasFeature.active) &&
			type === 'msteams'
		) {
			// channel type is not available for users plan
			return <UpgradePrompt />;
		}

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
			<Typography.Title level={3}>{title}</Typography.Title>

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
						defaultChecked={initialValue?.send_resolved}
						data-testid="field-send-resolved-checkbox"
						onChange={(value): void => {
							setSelectedConfig((state) => ({
								...state,
								send_resolved: value,
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
						{!isOssFeature?.active && (
							<Select.Option value="msteams" key="msteams" data-testid="select-option">
								<div>
									Microsoft Teams {!isUserOnEEPlan && '(Supported in Paid Plans Only)'}{' '}
								</div>
							</Select.Option>
						)}
					</Select>
				</Form.Item>

				<Form.Item>{renderSettings()}</Form.Item>

				<Form.Item>
					<Button
						disabled={savingState || !hasFeature}
						loading={savingState}
						type="primary"
						onClick={(): void => onSaveHandler(type)}
					>
						{t('button_save_channel')}
					</Button>
					<Button
						disabled={testingState || !hasFeature}
						loading={testingState}
						onClick={(): void => onTestHandler(type)}
					>
						{t('button_test_channel')}
					</Button>
					<Button
						onClick={(): void => {
							history.replace(ROUTES.SETTINGS);
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
