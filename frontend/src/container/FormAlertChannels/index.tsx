import { Form, FormInstance, Input, Select, Typography } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import { Store } from 'antd/lib/form/interface';
import ROUTES from 'constants/routes';
import {
	ChannelType,
	SlackChannel,
	SlackType,
	WebhookType,
} from 'container/CreateAlertChannels/config';
import history from 'lib/history';
import React from 'react';
import { useTranslation } from 'react-i18next';

import SlackSettings from './Settings/Slack';
import WebhookSettings from './Settings/Webhook';
import { Button } from './styles';

const { Option } = Select;
const { Title } = Typography;

function FormAlertChannels({
	formInstance,
	type,
	setSelectedConfig,
	onTypeChangeHandler,
	onTestHandler,
	onSaveHandler,
	savingState,
	testingState,
	NotificationElement,
	title,
	initialValue,
	nameDisable = false,
}: FormAlertChannelsProps): JSX.Element {
	const { t } = useTranslation('channels');

	const renderSettings = (): React.ReactElement | null => {
		switch (type) {
			case SlackType:
				return <SlackSettings setSelectedConfig={setSelectedConfig} />;
			case WebhookType:
				return <WebhookSettings setSelectedConfig={setSelectedConfig} />;
			default:
				return null;
		}
	};
	return (
		<>
			{NotificationElement}

			<Title level={3}>{title}</Title>

			<Form initialValues={initialValue} layout="vertical" form={formInstance}>
				<FormItem label={t('field_channel_name')} labelAlign="left" name="name">
					<Input
						disabled={nameDisable}
						onChange={(event): void => {
							setSelectedConfig((state) => ({
								...state,
								name: event.target.value,
							}));
						}}
					/>
				</FormItem>

				<FormItem label={t('field_channel_type')} labelAlign="left" name="type">
					<Select onChange={onTypeChangeHandler} value={type}>
						<Option value="slack" key="slack">
							Slack
						</Option>
						<Option value="webhook" key="webhook">
							Webhook
						</Option>
					</Select>
				</FormItem>

				<FormItem>{renderSettings()}</FormItem>

				<FormItem>
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
							history.replace(ROUTES.SETTINGS);
						}}
					>
						{t('button_return')}
					</Button>
				</FormItem>
			</Form>
		</>
	);
}

interface FormAlertChannelsProps {
	formInstance: FormInstance;
	type: ChannelType;
	setSelectedConfig: React.Dispatch<React.SetStateAction<Partial<SlackChannel>>>;
	onTypeChangeHandler: (value: ChannelType) => void;
	onSaveHandler: (props: ChannelType) => void;
	onTestHandler: (props: ChannelType) => void;
	testingState: boolean;
	savingState: boolean;
	NotificationElement: React.ReactElement<
		unknown,
		string | React.JSXElementConstructor<unknown>
	>;
	title: string;
	initialValue: Store;
	nameDisable?: boolean;
}

FormAlertChannels.defaultProps = {
	nameDisable: undefined,
};

export default FormAlertChannels;
