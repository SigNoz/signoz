import { Form, FormInstance, Input, Select, Typography } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import { Store } from 'antd/lib/form/interface';
import ROUTES from 'constants/routes';
import {
	ChannelType,
	SlackChannel,
} from 'container/CreateAlertChannels/config';
import history from 'lib/history';
import React from 'react';

import SlackSettings from './Settings/Slack';
import { Button } from './styles';

const { Option } = Select;
const { Title } = Typography;

function FormAlertChannels({
	formInstance,
	type,
	setSelectedConfig,
	onTypeChangeHandler,
	// onTestHandler,
	onSaveHandler,
	savingState,
	NotificationElement,
	title,
	initialValue,
	nameDisable = false,
}: FormAlertChannelsProps): JSX.Element {
	return (
		<>
			{NotificationElement}

			<Title level={3}>{title}</Title>

			<Form initialValues={initialValue} layout="vertical" form={formInstance}>
				<FormItem label="Name" labelAlign="left" name="name">
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

				<FormItem label="Type" labelAlign="left" name="type">
					<Select onChange={onTypeChangeHandler} value={type}>
						<Option value="slack" key="slack">
							Slack
						</Option>
					</Select>
				</FormItem>

				<FormItem>
					{type === 'slack' && (
						<SlackSettings setSelectedConfig={setSelectedConfig} />
					)}
				</FormItem>

				<FormItem>
					<Button
						disabled={savingState}
						loading={savingState}
						type="primary"
						onClick={(): void => onSaveHandler(type)}
					>
						Save
					</Button>
					{/* <Button onClick={onTestHandler}>Test</Button> */}
					<Button
						onClick={(): void => {
							history.replace(ROUTES.SETTINGS);
						}}
					>
						Back
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
