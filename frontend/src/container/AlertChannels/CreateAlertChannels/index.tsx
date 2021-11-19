import { Form, Input, Select, Typography } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import React, { useCallback, useState } from 'react';

import SlackSettings from './Settings/Slack';
import { Button } from './styles';

const CreateAlertChannels = ({
	onToggleHandler,
	preType = 'slack',
}: CreateAlertChannelsProps) => {
	const [formInstance] = Form.useForm();
	const [name, setName] = useState<string>('');
	const [type, setType] = useState(preType);

	const onTypeChangeHandler = useCallback((value: string) => {
		setType(value);
	}, []);

	const onTestHandler = useCallback(() => {
		console.log('test');
	}, []);

	const onSaveHandler = useCallback(() => {
		console.log('save handler');
	}, []);

	return (
		<>
			<Typography>New Notification Channels</Typography>
			<Form
				initialValues={{
					type: type,
				}}
				layout="vertical"
				form={formInstance}
			>
				<FormItem label="Name" labelAlign="left" name="name">
					<Input />
				</FormItem>

				<FormItem label="Type" labelAlign="left" name="type">
					<Select onChange={onTypeChangeHandler} value={type}>
						<option value="slack" key="slack">
							Slack
						</option>

						<option value="email" key="email">
							Email
						</option>
					</Select>
				</FormItem>

				<FormItem>{type === 'slack' && <SlackSettings />}</FormItem>

				<FormItem>
					<Button type="primary" onClick={onSaveHandler}>
						Save
					</Button>
					<Button onClick={onTestHandler}>Test</Button>
					<Button onClick={onToggleHandler}>Back</Button>
				</FormItem>
			</Form>
		</>
	);
};

interface CreateAlertChannelsProps {
	onToggleHandler: () => void;
	preType?: string;
}

export default CreateAlertChannels;
