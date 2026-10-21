import { useTranslation } from 'react-i18next';
import { Controller, useFormContext } from 'react-hook-form';
import { Input } from '@signozhq/ui/input';
import { Input as AntdInput, Select } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';
import FormCard from '../FormCard';
import FormField from '../FormField';

const { TextArea } = AntdInput;

function JsmOpsSettings(): JSX.Element {
	const { t } = useTranslation('channels');
	const {
		register,
		control,
		formState: { errors },
	} = useFormContext<ChannelSpecFormValues>();

	const advanced = (
		<>
			<FormField
				label={t('field_jsmops_priority')}
				help={t('help_jsmops_priority')}
				error={errors.priority?.message}
			>
				<Controller
					control={control}
					name="priority"
					render={({ field }): JSX.Element => (
						<TextArea
							rows={2}
							data-testid="jsmops-priority-textarea"
							value={(field.value as string) ?? ''}
							onChange={field.onChange}
						/>
					)}
				/>
			</FormField>

			<FormField
				label={t('field_jsmops_tags')}
				help={t('help_jsmops_tags')}
				error={errors.tags?.message}
			>
				{/* the API takes one comma-separated string, the control edits chips */}
				<Controller
					control={control}
					name="tags"
					render={({ field }): JSX.Element => (
						<Select
							mode="tags"
							open={false}
							placeholder={t('placeholder_jsmops_tags')}
							value={field.value ? String(field.value).split(',') : []}
							onChange={(value): void => field.onChange((value as string[]).join(','))}
							data-testid="jsmops-tags-select"
						/>
					)}
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
					testId="jsmops-tip"
					style={{ display: 'block', marginBottom: 16 }}
				>
					{t('jsmops_tip')}{' '}
					<Typography.Link
						href="https://signoz.io/docs/alerts-management/notification-channel/jsm-ops/"
						target="_blank"
						rel="noopener noreferrer"
					>
						{t('jsmops_tip_link')}
					</Typography.Link>
				</Typography.Text>

				<FormField
					label={t('field_jsmops_api_key')}
					help={t('help_jsmops_api_key')}
					error={errors.apiKey?.message}
					required
				>
					<Input
						{...register('apiKey')}
						aria-required
						type="password"
						data-testid="jsmops-api-key-textbox"
					/>
				</FormField>

				<FormField
					label={t('field_jsmops_message')}
					help={t('help_jsmops_message')}
					error={errors.message?.message}
				>
					<Controller
						control={control}
						name="message"
						render={({ field }): JSX.Element => (
							<TextArea
								rows={2}
								data-testid="jsmops-message-textarea"
								value={(field.value as string) ?? ''}
								onChange={field.onChange}
							/>
						)}
					/>
				</FormField>

				<FormField
					label={t('field_jsmops_description')}
					help={t('help_jsmops_description')}
					error={errors.description?.message}
				>
					<Controller
						control={control}
						name="description"
						render={({ field }): JSX.Element => (
							<TextArea
								rows={6}
								data-testid="jsmops-description-textarea"
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

export default JsmOpsSettings;
