import { useTranslation } from 'react-i18next';
import { Controller, useFormContext } from 'react-hook-form';
import { Input } from '@signozhq/ui/input';
import { Input as AntdInput } from 'antd';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';
import FormCard from '../FormCard';
import FormField from '../FormField';
import PagerDetails from './PagerDetails';

const { TextArea } = AntdInput;

function PagerForm(): JSX.Element {
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
					label={t('field_pager_routing_key')}
					tooltip={t('tooltip_pager_routing_key')}
					error={errors.routingKey?.message}
					required
				>
					<Input
						{...register('routingKey')}
						aria-required
						data-testid="pager-routing-key-textbox"
					/>
				</FormField>

				<FormField
					help={t('help_pager_description')}
					label={t('field_pager_description')}
					error={errors.description?.message}
				>
					<Controller
						control={control}
						name="description"
						render={({ field }): JSX.Element => (
							<TextArea
								rows={4}
								placeholder={t('placeholder_pager_description')}
								data-testid="pager-description-textarea"
								value={(field.value as string) ?? ''}
								onChange={field.onChange}
							/>
						)}
					/>
				</FormField>

				<FormField
					help={t('help_pager_severity')}
					label={t('field_pager_severity')}
					error={errors.severity?.message}
				>
					<Input {...register('severity')} data-testid="pager-severity-textbox" />
				</FormField>

				<PagerDetails />

				<FormField
					help={t('help_pager_component')}
					label={t('field_pager_component')}
					error={errors.component?.message}
				>
					<Input {...register('component')} />
				</FormField>

				<FormField
					help={t('help_pager_group')}
					label={t('field_pager_group')}
					error={errors.group?.message}
				>
					<Input {...register('group')} data-testid="pager-group-textarea" />
				</FormField>

				<FormField
					help={t('help_pager_class')}
					label={t('field_pager_class')}
					error={errors.class?.message}
				>
					<Input {...register('class')} data-testid="pager-class-textarea" />
				</FormField>
				<FormField
					help={t('help_pager_client')}
					label={t('field_pager_client')}
					error={errors.client?.message}
				>
					<Input {...register('client')} data-testid="pager-client-textarea" />
				</FormField>

				<FormField
					help={t('help_pager_client_url')}
					label={t('field_pager_client_url')}
					error={errors.clientUrl?.message}
				>
					<Input
						{...register('clientUrl')}
						data-testid="pager-client-url-textarea"
					/>
				</FormField>
			</FormCard>
		</>
	);
}

export default PagerForm;
