import { useTranslation } from 'react-i18next';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Input } from '@signozhq/ui/input';
import { RadioGroup } from '@signozhq/ui/radio-group';
import { Input as AntdInput, Select } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import {
	ChannelSpecFormValues,
	JiraDeployment,
} from '../../CreateAlertChannels/types';
import FormCard from '../FormCard';
import FormField from '../FormField';

import styles from './Jira.module.scss';

const { TextArea } = AntdInput;

function JiraSettings(): JSX.Element {
	const { t } = useTranslation('channels');
	const {
		register,
		control,
		formState: { errors },
	} = useFormContext<ChannelSpecFormValues>();
	const deployment = useWatch({ control, name: 'deployment' });
	const selfHosted = deployment === JiraDeployment.selfhosted;

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
					testId="jira-priority-textbox"
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
					testId="jira-resolve-transition-textbox"
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
					testId="jira-reopen-transition-textbox"
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
					testId="jira-wont-fix-resolution-textbox"
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
					testId="jira-reopen-duration-textbox"
				/>
			</FormField>
		</>
	);

	return (
		<>
			<FormCard title={t('section_connection')}>
				<FormField label={t('field_jira_deployment')}>
					<Controller
						control={control}
						name="deployment"
						render={({ field }): JSX.Element => (
							<div className={styles.deployment}>
								<RadioGroup
									color="primary"
									aria-label={t('field_jira_deployment')}
									value={deployment}
									onChange={field.onChange}
									testId="jira-deployment-radio"
									items={[
										{
											value: JiraDeployment.cloud,
											label: t('option_jira_deployment_cloud'),
										},
										{
											value: JiraDeployment.selfhosted,
											label: t('option_jira_deployment_selfhosted'),
										},
									]}
								/>
							</div>
						)}
					/>
				</FormField>

				{selfHosted ? (
					<Typography
						variant="paragraph"
						size="small"
						weight="regular"
						color="secondary"
						as="p"
						marginBottom={8}
						textOverflow="wrap"
						testId="jira-selfhosted-tip"
					>
						{t('jira_selfhosted_tip')}{' '}
						<Typography.Link
							variant="paragraph"
							size="base"
							weight="regular"
							textOverflow="wrap"
							href="https://signoz.io/docs/alerts-management/notification-channel/jira/#self-hosted-jira"
							target="_blank"
						>
							{t('jira_selfhosted_tip_link')}
						</Typography.Link>
					</Typography>
				) : (
					<Typography
						variant="paragraph"
						size="small"
						weight="regular"
						color="secondary"
						as="p"
						marginBottom={8}
						textOverflow="wrap"
						testId="jira-service-account-tip"
					>
						{t('jira_service_account_tip')}{' '}
						<Typography.Link
							variant="paragraph"
							size="base"
							weight="regular"
							textOverflow="wrap"
							href="https://signoz.io/docs/alerts-management/notification-channel/jira/#use-a-service-account-recommended"
							target="_blank"
						>
							{t('jira_service_account_tip_link')}
						</Typography.Link>
					</Typography>
				)}

				<FormField
					label={t('field_jira_site')}
					tooltip={t(
						selfHosted ? 'tooltip_jira_site_selfhosted' : 'tooltip_jira_site',
					)}
					error={errors.site?.message}
					required
				>
					<Input
						{...register('site')}
						aria-required
						placeholder={
							selfHosted
								? 'https://jira.your-company.com'
								: 'https://your-domain.atlassian.net'
						}
						testId="jira-site-textbox"
					/>
				</FormField>

				{selfHosted ? (
					<FormField
						label={t('field_jira_pat')}
						help={t('help_jira_pat')}
						error={errors.auth?.pat?.message}
						required
					>
						<Input
							{...register('auth.pat')}
							aria-required
							type="password"
							testId="jira-pat-textbox"
						/>
					</FormField>
				) : (
					<>
						<FormField
							label={t('field_jira_email')}
							help={t('help_jira_email')}
							error={errors.auth?.email?.message}
							required
						>
							<Input
								{...register('auth.email')}
								aria-required
								testId="jira-email-textbox"
							/>
						</FormField>

						<FormField
							label={t('field_jira_api_token')}
							help={t('help_jira_api_token')}
							error={errors.auth?.apiToken?.message}
							required
						>
							<Input
								{...register('auth.apiToken')}
								aria-required
								type="password"
								testId="jira-api-token-textbox"
							/>
						</FormField>
					</>
				)}

				<FormField
					label={t('field_jira_project')}
					error={errors.project?.message}
					required
				>
					<Input
						{...register('project')}
						aria-required
						placeholder="e.g. OPS"
						testId="jira-project-textbox"
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
						testId="jira-issue-type-textbox"
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
					help={t(
						selfHosted ? 'help_jira_description_selfhosted' : 'help_jira_description',
					)}
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
