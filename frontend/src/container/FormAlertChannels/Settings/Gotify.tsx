import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Input, InputNumber } from 'antd';

import { GotifyChannel } from '../../CreateAlertChannels/config';

function Gotify({ setSelectedConfig }: GotifyProps): JSX.Element {
	const { t } = useTranslation('channels');

	return (
		<>
			<Form.Item
				name="url"
				label={t('field_gotify_url', { defaultValue: 'Gotify Server URL' })}
				required
				rules={[
					{
						required: true,
						message: t('gotify_url_required', {
							defaultValue: 'Gotify server URL is required',
						}),
					},
				]}
			>
				<Input
					onChange={(event): void => {
						setSelectedConfig((value) => ({
							...value,
							url: event.target.value,
						}));
					}}
					placeholder="http://localhost:80 or https://gotify.example.com"
					data-testid="gotify-url-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="token"
				label={t('field_gotify_token', { defaultValue: 'Application Token' })}
				required
				rules={[
					{
						required: true,
						message: t('gotify_token_required', {
							defaultValue: 'Application token is required',
						}),
					},
				]}
			>
				<Input.Password
					onChange={(event): void => {
						setSelectedConfig((value) => ({
							...value,
							token: event.target.value,
						}));
					}}
					data-testid="gotify-token-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="priority"
				label={t('field_gotify_priority', { defaultValue: 'Priority' })}
				initialValue={5}
			>
				<InputNumber
					min={0}
					max={10}
					onChange={(val): void => {
						setSelectedConfig((value) => ({
							...value,
							priority: val ?? 5,
						}));
					}}
					data-testid="gotify-priority-input"
				/>
			</Form.Item>

			<Form.Item name="title" label={t('field_slack_title')}>
				<Input.TextArea
					rows={2}
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							title: event.target.value,
						}))
					}
					data-testid="title-textarea"
				/>
			</Form.Item>

			<Form.Item name="message" label={t('field_slack_description')}>
				<Input.TextArea
					rows={4}
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							message: event.target.value,
						}))
					}
					data-testid="message-textarea"
					placeholder={t('placeholder_slack_description')}
				/>
			</Form.Item>
		</>
	);
}

interface GotifyProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<GotifyChannel>>>;
}

export default Gotify;
