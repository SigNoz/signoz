import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Collapse, Form, Input, Select } from 'antd';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';

import { JiraChannel } from '../../CreateAlertChannels/config';
import {
	isValidJiraReopenDuration,
	isValidJiraSiteURL,
} from '../../CreateAlertChannels/utils';

function JiraSettings({ setSelectedConfig }: JiraProps): JSX.Element {
	const { t } = useTranslation('channels');

	const update = (patch: Partial<JiraChannel>): void =>
		setSelectedConfig((value) => ({ ...value, ...patch }));

	const advanced = (
		<>
			<Form.Item
				name="priority"
				label={t('field_jira_priority')}
				help={t('help_jira_priority')}
			>
				<Input
					placeholder={t('placeholder_jira_priority')}
					onChange={(event): void => update({ priority: event.target.value })}
					data-testid="jira-priority-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="labels"
				label={t('field_jira_labels')}
				help={t('help_jira_labels')}
			>
				<Select
					mode="tags"
					open={false}
					placeholder={t('placeholder_jira_labels')}
					onChange={(value): void => update({ labels: value as string[] })}
					data-testid="jira-labels-select"
				/>
			</Form.Item>

			<Form.Item
				name="resolve_transition"
				label={t('field_jira_resolve_transition')}
				help={t('help_jira_resolve_transition')}
			>
				<Input
					placeholder={t('placeholder_jira_resolve_transition')}
					onChange={(event): void =>
						update({ resolve_transition: event.target.value })
					}
					data-testid="jira-resolve-transition-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="reopen_transition"
				label={t('field_jira_reopen_transition')}
				help={t('help_jira_reopen_transition')}
			>
				<Input
					placeholder={t('placeholder_jira_reopen_transition')}
					onChange={(event): void =>
						update({ reopen_transition: event.target.value })
					}
					data-testid="jira-reopen-transition-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="reopen_duration"
				label={t('field_jira_reopen_duration')}
				extra={t('help_jira_reopen_duration')}
				rules={[
					{
						validator: (_, value: string): Promise<void> =>
							isValidJiraReopenDuration(value)
								? Promise.resolve()
								: Promise.reject(new Error(t('jira_reopen_duration_invalid'))),
					},
				]}
				tooltip={{
					title: (
						<MarkdownRenderer
							markdownContent={t('tooltip_jira_reopen_duration')}
							variables={{}}
						/>
					),
					overlayInnerStyle: { maxWidth: 400 },
					placement: 'right',
				}}
			>
				<Input
					placeholder={t('placeholder_jira_reopen_duration')}
					onChange={(event): void => update({ reopen_duration: event.target.value })}
					data-testid="jira-reopen-duration-textbox"
				/>
			</Form.Item>
		</>
	);

	return (
		<>
			<Form.Item
				name="site"
				label={t('field_jira_site')}
				required
				rules={[
					{
						validator: (_, value: string): Promise<void> =>
							!value || isValidJiraSiteURL(value)
								? Promise.resolve()
								: Promise.reject(new Error(t('jira_site_invalid'))),
					},
				]}
				tooltip={{
					title: (
						<MarkdownRenderer
							markdownContent={t('tooltip_jira_site')}
							variables={{}}
						/>
					),
					overlayInnerStyle: { maxWidth: 400 },
					placement: 'right',
				}}
			>
				<Input
					placeholder="https://your-domain.atlassian.net"
					onChange={(event): void => update({ site: event.target.value })}
					data-testid="jira-site-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="username"
				label={t('field_jira_email')}
				help={t('help_jira_email')}
				required
			>
				<Input
					onChange={(event): void => update({ username: event.target.value })}
					data-testid="jira-email-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="password"
				label={t('field_jira_api_token')}
				help={t('help_jira_api_token')}
				required
			>
				<Input
					type="password"
					onChange={(event): void => update({ password: event.target.value })}
					data-testid="jira-api-token-textbox"
				/>
			</Form.Item>

			<Form.Item name="project" label={t('field_jira_project')} required>
				<Input
					placeholder="e.g. OPS"
					onChange={(event): void => update({ project: event.target.value })}
					data-testid="jira-project-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="issue_type"
				label={t('field_jira_issue_type')}
				help={t('help_jira_issue_type')}
				required
			>
				<Input
					onChange={(event): void => update({ issue_type: event.target.value })}
					data-testid="jira-issue-type-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="summary"
				label={t('field_jira_summary')}
				help={t('help_jira_summary')}
			>
				<Input.TextArea
					rows={2}
					onChange={(event): void => update({ summary: event.target.value })}
					data-testid="jira-summary-textarea"
				/>
			</Form.Item>

			<Form.Item
				name="description"
				label={t('field_jira_description')}
				help={t('help_jira_description')}
			>
				<Input.TextArea
					rows={6}
					onChange={(event): void => update({ description: event.target.value })}
					data-testid="jira-description-textarea"
				/>
			</Form.Item>

			<Collapse
				ghost
				items={[
					{
						key: 'advanced',
						label: t('jira_advanced_section'),
						children: advanced,
					},
				]}
			/>
		</>
	);
}

interface JiraProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<JiraChannel>>>;
}

export default JiraSettings;
