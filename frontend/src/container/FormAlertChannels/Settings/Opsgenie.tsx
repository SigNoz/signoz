import { useTranslation } from 'react-i18next';
import { Controller, useFormContext } from 'react-hook-form';
import { Input } from '@signozhq/ui/input';
import { Input as AntdInput } from 'antd';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';
import FormCard from '../FormCard';
import FormField from '../FormField';

const { TextArea } = AntdInput;

function OpsgenieForm(): JSX.Element {
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
					label={t('field_opsgenie_api_key')}
					tooltip={t('tooltip_opsgenie_api_key')}
					error={errors.apiKey?.message}
					required
				>
					<Input
						{...register('apiKey')}
						aria-required
						data-testid="opsgenie-api-key-textbox"
					/>
				</FormField>

				<FormField
					help={t('help_opsgenie_message')}
					label={t('field_opsgenie_message')}
					error={errors.message?.message}
				>
					<Controller
						control={control}
						name="message"
						render={({ field }): JSX.Element => (
							<TextArea
								rows={4}
								placeholder={t('placeholder_opsgenie_message')}
								data-testid="opsgenie-message-textarea"
								value={(field.value as string) ?? ''}
								onChange={field.onChange}
							/>
						)}
					/>
				</FormField>

				<FormField
					help={t('help_opsgenie_description')}
					label={t('field_opsgenie_description')}
					error={errors.description?.message}
				>
					<Controller
						control={control}
						name="description"
						render={({ field }): JSX.Element => (
							<TextArea
								rows={4}
								placeholder={t('placeholder_opsgenie_description')}
								data-testid="opsgenie-description-textarea"
								value={(field.value as string) ?? ''}
								onChange={field.onChange}
							/>
						)}
					/>
				</FormField>

				<FormField
					help={t('help_opsgenie_priority')}
					label={t('field_opsgenie_priority')}
					error={errors.priority?.message}
				>
					<Controller
						control={control}
						name="priority"
						render={({ field }): JSX.Element => (
							<TextArea
								rows={4}
								placeholder={t('placeholder_opsgenie_priority')}
								data-testid="opsgenie-priority-textarea"
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

export default OpsgenieForm;
