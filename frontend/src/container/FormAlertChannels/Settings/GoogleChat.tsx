import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Input } from 'antd';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';

import { GoogleChatChannel } from '../../CreateAlertChannels/config';
import { isValidGoogleChatWebhookURL } from '../../CreateAlertChannels/utils';

function GoogleChat({ setSelectedConfig }: GoogleChatProps): JSX.Element {
	const { t } = useTranslation('channels');

	return (
		<>
			<Form.Item
				name="webhook_url"
				label={t('field_webhook_url')}
				required
				rules={[
					{
						validator: (_, value: string): Promise<void> =>
							!value || isValidGoogleChatWebhookURL(value)
								? Promise.resolve()
								: Promise.reject(new Error(t('google_chat_webhook_url_invalid'))),
					},
				]}
				tooltip={{
					title: (
						<MarkdownRenderer
							markdownContent={t('tooltip_google_chat_url')}
							variables={{}}
						/>
					),
					overlayInnerStyle: { maxWidth: 400 },
					placement: 'right',
				}}
			>
				<Input
					onChange={(event): void => {
						setSelectedConfig((value) => ({
							...value,
							webhook_url: event.target.value,
						}));
					}}
					data-testid="webhook-url-textbox"
				/>
			</Form.Item>

			<Form.Item name="title" label={t('field_slack_title')}>
				<Input.TextArea
					rows={4}
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							title: event.target.value,
						}))
					}
					data-testid="title-textarea"
				/>
			</Form.Item>

			<Form.Item name="text" label={t('field_slack_description')}>
				<Input.TextArea
					rows={4}
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							text: event.target.value,
						}))
					}
					data-testid="description-textarea"
					placeholder={t('placeholder_slack_description')}
				/>
			</Form.Item>
		</>
	);
}

interface GoogleChatProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<GoogleChatChannel>>>;
}

export default GoogleChat;
