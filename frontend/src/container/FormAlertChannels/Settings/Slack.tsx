import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Input } from 'antd';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';

import {
	AlertmanagertypesChannelSlackActionDTO,
	AlertmanagertypesChannelSlackFieldDTO,
} from 'api/generated/services/sigNoz.schemas';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';
import SlackActions from './SlackActions';
import SlackFields from './SlackFields';

const { TextArea } = Input;

function Slack({
	setSelectedConfig,
	initialFields,
	initialActions,
}: SlackProps): JSX.Element {
	const { t } = useTranslation('channels');

	return (
		<>
			<Form.Item
				name="apiUrl"
				label={t('field_webhook_url')}
				tooltip={{
					title: (
						<MarkdownRenderer
							markdownContent={t('tooltip_slack_url')}
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
							apiUrl: event.target.value,
						}));
					}}
					data-testid="webhook-url-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="channel"
				help={t('slack_channel_help')}
				label={t('field_slack_recipient')}
			>
				<Input
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							channel: event.target.value,
						}))
					}
					data-testid="slack-channel-textbox"
				/>
			</Form.Item>

			<Form.Item name="title" label={t('field_slack_title')}>
				<TextArea
					data-testid="title-textarea"
					rows={4}
					// value={`[{{ .Status | toUpper }}{{ if eq .Status \"firing\" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }} for {{ .CommonLabels.job }}\n{{- if gt (len .CommonLabels) (len .GroupLabels) -}}\n{{\" \"}}(\n{{- with .CommonLabels.Remove .GroupLabels.Names }}\n    {{- range $index, $label := .SortedPairs -}}\n    {{ if $index }}, {{ end }}\n    {{- $label.Name }}=\"{{ $label.Value -}}\"\n    {{- end }}\n{{- end -}}\n)\n{{- end }}`}
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							title: event.target.value,
						}))
					}
				/>
			</Form.Item>

			<Form.Item name="titleLink" label={t('field_slack_title_link')}>
				<Input
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							titleLink: event.target.value,
						}))
					}
					data-testid="title-link-textbox"
				/>
			</Form.Item>

			<Form.Item name="text" label={t('field_slack_description')}>
				<TextArea
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							text: event.target.value,
						}))
					}
					placeholder={t('placeholder_slack_description')}
					data-testid="description-textarea"
				/>
			</Form.Item>

			<Form.Item
				name="color"
				label={t('field_slack_color')}
				help={t('help_slack_color')}
			>
				<Input
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							color: event.target.value,
						}))
					}
					placeholder={t('placeholder_slack_color')}
					data-testid="slack-color-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="pretext"
				label={t('field_slack_pretext')}
				help={t('help_slack_pretext')}
			>
				<Input
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							pretext: event.target.value,
						}))
					}
					data-testid="slack-pretext-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="fallback"
				label={t('field_slack_fallback')}
				help={t('help_slack_fallback')}
			>
				<Input
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							fallback: event.target.value,
						}))
					}
					data-testid="slack-fallback-textbox"
				/>
			</Form.Item>

			<Form.Item name="footer" label={t('field_slack_footer')}>
				<Input
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							footer: event.target.value,
						}))
					}
					data-testid="slack-footer-textbox"
				/>
			</Form.Item>

			<SlackFields
				setSelectedConfig={setSelectedConfig}
				initialFields={initialFields}
			/>

			<SlackActions
				setSelectedConfig={setSelectedConfig}
				initialActions={initialActions}
			/>
		</>
	);
}

interface SlackProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<ChannelSpecFormValues>>>;
	initialFields?: AlertmanagertypesChannelSlackFieldDTO[];
	initialActions?: AlertmanagertypesChannelSlackActionDTO[];
}

export default Slack;
