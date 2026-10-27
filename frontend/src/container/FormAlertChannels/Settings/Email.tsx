import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { Input } from '@signozhq/ui/input';
import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';
import FormCard from '../FormCard';
import FormField from '../FormField';

function EmailForm(): JSX.Element {
	const { t } = useTranslation('channels');
	const {
		register,
		formState: { errors },
	} = useFormContext<ChannelSpecFormValues>();

	return (
		<>
			<FormCard title={t('section_recipients')}>
				<FormField
					help={t('help_email_to')}
					label={t('field_email_to')}
					tooltip={t('tooltip_email_to')}
					error={errors.to?.message}
					required
				>
					<Input
						{...register('to')}
						aria-required
						placeholder={t('placeholder_email_to')}
						data-testid="email-to-textbox"
					/>
				</FormField>
			</FormCard>
		</>
	);
}

export default EmailForm;
