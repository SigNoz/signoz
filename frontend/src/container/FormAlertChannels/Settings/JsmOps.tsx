import React from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Input } from 'antd';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';

import { JsmOpsChannel } from '../../CreateAlertChannels/config';

const { TextArea } = Input;

function JsmOps({ setSelectedConfig }: JsmOpsProps): JSX.Element {
	const { t } = useTranslation('channels');

	const handleInputChange =
		(field: string) =>
		(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
			setSelectedConfig((value) => ({
				...value,
				[field]: event.target.value,
			}));
		};

	return (
		<>
			<Form.Item
				name="email"
				label={t('field_jsmops_email')}
				tooltip={{
					title: (
						<MarkdownRenderer
							markdownContent={t('tooltip_jsmops_email')}
							variables={{}}
						/>
					),
					overlayInnerStyle: { maxWidth: 400 },
					placement: 'right',
				}}
				required
			>
				<Input
					onChange={handleInputChange('email')}
					data-testid="jsmops-email-textbox"
					placeholder="user@example.com"
				/>
			</Form.Item>

			<Form.Item
				name="api_token"
				label={t('field_jsmops_api_token')}
				tooltip={{
					title: (
						<MarkdownRenderer
							markdownContent={t('tooltip_jsmops_api_token')}
							variables={{}}
						/>
					),
					overlayInnerStyle: { maxWidth: 400 },
					placement: 'right',
				}}
				required
			>
				<Input.Password
					onChange={handleInputChange('api_token')}
					data-testid="jsmops-api-token-textbox"
					placeholder="API Token"
				/>
			</Form.Item>

			<Form.Item
				name="cloud_id"
				label={t('field_jsmops_cloud_id')}
				tooltip={{
					title: (
						<MarkdownRenderer
							markdownContent={t('tooltip_jsmops_cloud_id')}
							variables={{}}
						/>
					),
					overlayInnerStyle: { maxWidth: 400 },
					placement: 'right',
				}}
				required
			>
				<Input
					onChange={handleInputChange('cloud_id')}
					data-testid="jsmops-cloud-id-textbox"
					placeholder="cloud-id"
				/>
			</Form.Item>

			<Form.Item
				name="responders"
				label={t('field_jsmops_responders')}
				tooltip={{
					title: (
						<MarkdownRenderer
							markdownContent={t('tooltip_jsmops_responders')}
							variables={{}}
						/>
					),
					overlayInnerStyle: { maxWidth: 400 },
					placement: 'right',
				}}
			>
				<Input
					onChange={handleInputChange('responders')}
					data-testid="jsmops-responders-textbox"
					placeholder="team-id-1, team-id-2"
				/>
			</Form.Item>

			<Form.Item name="message" label={t('field_jsmops_message')} required>
				<TextArea
					rows={2}
					onChange={handleInputChange('message')}
					data-testid="jsmops-message-textarea"
					placeholder={`[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}`}
				/>
			</Form.Item>

			<Form.Item name="description" label={t('field_jsmops_description')}>
				<TextArea
					rows={4}
					onChange={handleInputChange('description')}
					data-testid="jsmops-description-textarea"
					placeholder={t('placeholder_jsmops_description')}
				/>
			</Form.Item>

			<Form.Item
				name="tags"
				label={t('field_jsmops_tags')}
				tooltip={{
					title: (
						<MarkdownRenderer
							markdownContent={t('tooltip_jsmops_tags')}
							variables={{}}
						/>
					),
					overlayInnerStyle: { maxWidth: 400 },
					placement: 'right',
				}}
			>
				<Input
					onChange={handleInputChange('tags')}
					data-testid="jsmops-tags-textbox"
					placeholder="tag1, tag2, tag3"
				/>
			</Form.Item>

			<Form.Item
				name="priority"
				label={t('field_jsmops_priority')}
				tooltip={{
					title: (
						<MarkdownRenderer
							markdownContent={t('tooltip_jsmops_priority')}
							variables={{}}
						/>
					),
					overlayInnerStyle: { maxWidth: 400 },
					placement: 'right',
				}}
			>
				<Input
					onChange={handleInputChange('priority')}
					data-testid="jsmops-priority-textbox"
					placeholder="high"
				/>
			</Form.Item>
		</>
	);
}

interface JsmOpsProps {
	setSelectedConfig: React.Dispatch<
		React.SetStateAction<Partial<JsmOpsChannel>>
	>;
}

export default JsmOps;
