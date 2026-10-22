import { useTranslation } from 'react-i18next';
import { Controller, useFormContext } from 'react-hook-form';
import { Input } from '@signozhq/ui/input';
import { Input as AntdInput, Select } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';
import FormCard from '../FormCard';
import FormField from '../FormField';

const { TextArea } = AntdInput;

function JiraSettings(): JSX.Element {
	const { t } = useTranslation('channels');
	const {
		register,
		control,
		formState: { errors },
	} = useFormContext<ChannelSpecFormValues>();

	const advanced = (
		<>
			<FormField
				label={t('field_jira_priority')}
				help={t('help_jira_priority')}
				error={errors.priority?.message}
			>
				<Input
					{...register('priority')}
					placeholder={t('placeholder_jira_priority')}
					data-testid="jira-priority-textbox"
				/>
			</FormField>

			<FormField
				label={t('field_jira_labels')}
				help={t('help_jira_labels')}
				error={errors.labels?.message}
			>
				<Select
					mode="tags"
					open={false}
					placeholder={t('placeholder_jira_labels')}
					data-testid="jira-labels-select"
				/>
			</FormField>

			<FormField
				label={t('field_jira_resolve_transition')}
				help={t('help_jira_resolve_transition')}
				error={errors.resolveTransition?.message}
			>
				<Input
					{...register('resolveTransition')}
					placeholder={t('placeholder_jira_resolve_transition')}
					data-testid="jira-resolve-transition-textbox"
				/>
			</FormField>

			<FormField
				label={t('field_jira_reopen_transition')}
				help={t('help_jira_reopen_transition')}
				error={errors.reopenTransition?.message}
			>
				<Input
					{...register('reopenTransition')}
					placeholder={t('placeholder_jira_reopen_transition')}
					data-testid="jira-reopen-transition-textbox"
				/>
			</FormField>

			<FormField
				label={t('field_jira_wont_fix_resolution')}
				help={t('help_jira_wont_fix_resolution')}
				error={errors.wontFixResolution?.message}
			>
				<Input
					{...register('wontFixResolution')}
					placeholder={t('placeholder_jira_wont_fix_resolution')}
					data-testid="jira-wont-fix-resolution-textbox"
				/>
			</FormField>

			<FormField
				label={t('field_jira_reopen_duration')}
				tooltip={t('tooltip_jira_reopen_duration')}
				help={t('help_jira_reopen_duration')}
				error={errors.reopenDuration?.message}
			>
				<Input
					{...register('reopenDuration')}
					placeholder={t('placeholder_jira_reopen_duration')}
					data-testid="jira-reopen-duration-textbox"
				/>
			</FormField>
		</>
	);

	return (
		<>
			<FormCard title={t('section_connection')}>
				<Typography.Text
					color="muted"
					size="sm"
					testId="jira-service-account-tip"
					style={{ display: 'block', marginBottom: 16 }}
				>
					{t('jira_service_account_tip')}{' '}
					<Typography.Link
						href="https://signoz.io/docs/alerts-management/notification-channel/jira/#use-a-service-account-recommended"
						target="_blank"
						rel="noopener noreferrer"
					>
						{t('jira_service_account_tip_link')}
					</Typography.Link>
				</Typography.Text>

				<FormField
					label={t('field_jira_site')}
					tooltip={t('tooltip_jira_site')}
					error={errors.site?.message}
					required
				>
					<Input
						{...register('site')}
						aria-required
						placeholder="https://your-domain.atlassian.net"
						data-testid="jira-site-textbox"
					/>
				</FormField>

				<FormField
					label={t('field_jira_email')}
					help={t('help_jira_email')}
					error={errors.email?.message}
					required
				>
					<Input
						{...register('email')}
						aria-required
						data-testid="jira-email-textbox"
					/>
				</FormField>

				<FormField
					label={t('field_jira_api_token')}
					help={t('help_jira_api_token')}
					error={errors.apiToken?.message}
					required
				>
					<Input
						{...register('apiToken')}
						aria-required
						type="password"
						data-testid="jira-api-token-textbox"
					/>
				</FormField>

				<FormField
					label={t('field_jira_project')}
					error={errors.project?.message}
					required
				>
					<Input
						{...register('project')}
						aria-required
						placeholder="e.g. OPS"
						data-testid="jira-project-textbox"
					/>
				</FormField>

				<FormField
					label={t('field_jira_issue_type')}
					help={t('help_jira_issue_type')}
					error={errors.issueType?.message}
					required
				>
					<Input
						{...register('issueType')}
						aria-required
						data-testid="jira-issue-type-textbox"
					/>
				</FormField>

				<FormField
					label={t('field_jira_summary')}
					help={t('help_jira_summary')}
					error={errors.summary?.message}
				>
					<Controller
						control={control}
						name="summary"
						render={({ field }): JSX.Element => (
							<TextArea
								rows={2}
								data-testid="jira-summary-textarea"
								value={(field.value as string) ?? ''}
								onChange={field.onChange}
							/>
						)}
					/>
				</FormField>

				<FormField
					label={t('field_jira_description')}
					help={t('help_jira_description')}
					error={errors.description?.message}
				>
					<Controller
						control={control}
						name="description"
						render={({ field }): JSX.Element => (
							<TextArea
								rows={6}
								data-testid="jira-description-textarea"
								value={(field.value as string) ?? ''}
								onChange={field.onChange}
							/>
						)}
					/>
				</FormField>
			</FormCard>

			<FormCard title={t('section_advanced')}>{advanced}</FormCard>
		</>
	);
}

export default JiraSettings;
