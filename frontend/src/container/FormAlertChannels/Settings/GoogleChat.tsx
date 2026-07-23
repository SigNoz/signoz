import React from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Input } from 'antd';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';

import { GoogleChatChannel } from '../../CreateAlertChannels/config';

function GoogleChat({ setSelectedConfig }: GoogleChatProps): JSX.Element {
	const { t } = useTranslation('channels');

	return (
		<>
			<Form.Item
				name="webhook_url"
				label={t('field_webhook_url')}
				tooltip={{
					title: (
						<MarkdownRenderer
							markdownContent={t('tooltip_googlechat_url')}
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
					placeholder="https://chat.googleapis.com/v1/spaces/..."
				/>
			</Form.Item>

			<Form.Item name="title" label={t('field_googlechat_title')}>
				<Input.TextArea
					rows={2}
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							title: event.target.value,
						}))
					}
					data-testid="title-textarea"
					placeholder={`[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}`}
				/>
			</Form.Item>

			<Form.Item name="text" label={t('field_googlechat_description')}>
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
	setSelectedConfig: React.Dispatch<
		React.SetStateAction<Partial<GoogleChatChannel>>
	>;
}

export default GoogleChat;
