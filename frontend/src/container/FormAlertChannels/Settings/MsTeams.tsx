import React from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useFormContext } from 'react-hook-form';
import { Input } from '@signozhq/ui/input';
import { Input as AntdInput } from 'antd';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';
import FormCard from '../FormCard';
import FormField from '../FormField';

const { TextArea } = AntdInput;

function MsTeams(): JSX.Element {
	const { t } = useTranslation('channels');
	const {
		register,
		control,
		formState: { errors },
	} = useFormContext<ChannelSpecFormValues>();

	return (
		<>
			<FormCard title={t('section_connection')}>
				<FormField
					label={t('field_webhook_url')}
					tooltip={t('tooltip_ms_teams_url')}
					error={errors.webhookUrl?.message}
					required
				>
					<Input
						{...register('webhookUrl')}
						aria-required
						data-testid="webhook-url-textbox"
					/>
				</FormField>

				<FormField label={t('field_slack_title')} error={errors.title?.message}>
					<Controller
						control={control}
						name="title"
						render={({ field }): JSX.Element => (
							<TextArea
								rows={4}
								data-testid="title-textarea"
								value={(field.value as string) ?? ''}
								onChange={field.onChange}
							/>
						)}
					/>
				</FormField>

				<FormField
					label={t('field_slack_description')}
					error={errors.text?.message}
				>
					<Controller
						control={control}
						name="text"
						render={({ field }): JSX.Element => (
							<TextArea
								data-testid="description-textarea"
								placeholder={t('placeholder_slack_description')}
								value={(field.value as string) ?? ''}
								onChange={field.onChange}
							/>
						)}
					/>
				</FormField>
			</FormCard>
		</>
	);
}

export default MsTeams;
