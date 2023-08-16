import { Form, FormInstance, Input, Select, Typography } from 'antd';
import { Store } from 'antd/lib/form/interface';
import UpgradePrompt from 'components/Upgrade/UpgradePrompt';
import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import {
	ChannelType,
	MsTeamsType,
	PagerChannel,
	PagerType,
	SlackChannel,
	SlackType,
	WebhookChannel,
	WebhookType,
} from 'container/CreateAlertChannels/config';
import useFeatureFlags from 'hooks/useFeatureFlag';
import { isFeatureKeys } from 'hooks/useFeatureFlag/utils';
import history from 'lib/history';
import { Dispatch, ReactElement, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

import MsTeamsSettings from './Settings/MsTeams';
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
	const isUserOnEEPlan = useFeatureFlags(FeatureKeys.ENTERPRISE_PLAN);

	const feature = `ALERT_CHANNEL_${type.toUpperCase()}`;

	const hasFeature = useFeatureFlags(
		isFeatureKeys(feature) ? feature : FeatureKeys.ALERT_CHANNEL_SLACK,
	);

	const isOssFeature = useFeatureFlags(FeatureKeys.OSS);

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
			case SlackType:
				return <SlackSettings setSelectedConfig={setSelectedConfig} />;
			case WebhookType:
				return <WebhookSettings setSelectedConfig={setSelectedConfig} />;
			case PagerType:
				return <PagerSettings setSelectedConfig={setSelectedConfig} />;
			case MsTeamsType:
				return <MsTeamsSettings setSelectedConfig={setSelectedConfig} />;
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
						disabled={editing}
						onChange={(event): void => {
							setSelectedConfig((state) => ({
								...state,
								name: event.target.value,
							}));
						}}
					/>
				</Form.Item>

				<Form.Item label={t('field_channel_type')} labelAlign="left" name="type">
					<Select disabled={editing} onChange={onTypeChangeHandler} value={type}>
						<Select.Option value="slack" key="slack">
							Slack
						</Select.Option>
						<Select.Option value="webhook" key="webhook">
							Webhook
						</Select.Option>
						<Select.Option value="pagerduty" key="pagerduty">
							Pagerduty
						</Select.Option>
						{!isOssFeature?.active && (
							<Select.Option value="msteams" key="msteams">
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
		SetStateAction<Partial<SlackChannel & WebhookChannel & PagerChannel>>
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
