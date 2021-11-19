import { Form, Input, notification, Select, Typography } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import React, { useCallback, useState } from 'react';

import SlackSettings from './Settings/Slack';
import { Button } from './styles';
const { Title } = Typography;
const { Option } = Select;
import createSlackApi from 'api/channels/createSlack';

import { ChannelType, SlackChannel } from './config';

const CreateAlertChannels = ({
	onToggleHandler,
	preType = 'slack',
}: CreateAlertChannelsProps): JSX.Element => {
	const [formInstance] = Form.useForm();
	const [type, setType] = useState<ChannelType>(preType);
	const [selectedConfig, setSelectedConfig] = useState<Partial<SlackChannel>>();
	const [savingState, setSavingState] = useState<boolean>(false);
	const [notifications, Element] = notification.useNotification();

	const onTypeChangeHandler = useCallback((value: string) => {
		setType(value as ChannelType);
	}, []);

	const onTestHandler = useCallback(() => {
		console.log('test');
	}, []);

	const onSlackHandler = useCallback(async () => {
		try {
			setSavingState(true);
			const response = await createSlackApi({
				api_url: selectedConfig?.api_url || '',
				channel: selectedConfig?.channel || '',
				name: selectedConfig?.name || '',
				send_resolved: true,
				text: selectedConfig?.text || '',
				title: selectedConfig?.title || '',
			});

			if (response.statusCode === 200) {
				notifications.success({
					message: 'Success',
					description: 'Successfully created the channel',
				});
				setTimeout(() => {
					onToggleHandler();
				}, 2000);
			} else {
				notifications.error({
					message: 'Error',
					description: 'Error while creating the channel',
				});
			}
			setSavingState(false);
		} catch (error) {
			setSavingState(false);
		}
	}, [notifications, selectedConfig, onToggleHandler]);

	const onSaveHandler = useCallback(async () => {
		if (preType == 'slack') {
			onSlackHandler();
		}
	}, [preType, onSlackHandler]);

	return (
		<>
			{Element}

			<Title level={3}>New Notification Channels</Title>

			<Form
				initialValues={{
					type: type,
					text: `"{{ range .Alerts -}} *Alert:* {{ .Annotations.title }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }}\n*Description:* {{ .Annotations.description }}\n*Details:* {{ range .Labels.SortedPairs }} • *{{ .Name }}:* {{ .Value }} {{ end }} {{ end }}"`,
					title: `"[{{ .Status | toUpper }}{{ if eq .Status \\"firing\\" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }} for {{ .CommonLabels.job }}\n{{- if gt (len .CommonLabels) (len .GroupLabels) -}}\n{{\\" \\"}}(\n{{- with .CommonLabels.Remove .GroupLabels.Names }}\n    {{- range $index, $label := .SortedPairs -}}\n    {{ if $index }}, {{ end }}\n    {{- $label.Name }}=\\"{{ $label.Value -}}\\"\n    {{- end }}\n{{- end -}}\n)\n{{- end }}"`,
				}}
				layout="vertical"
				form={formInstance}
			>
				<FormItem label="Name" labelAlign="left" name="name">
					<Input
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
						onClick={onSaveHandler}
					>
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
	preType?: ChannelType;
}

export default CreateAlertChannels;
