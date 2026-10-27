import { useTranslation } from 'react-i18next';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Checkbox } from '@signozhq/ui/checkbox';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';
import FormField from '../FormField';
import RowEntry from './RowEntry';
import styles from './RowEditor.module.scss';

// Slack renders these as the attachment's table of short or full-width entries.
function SlackFields(): JSX.Element {
	const { t } = useTranslation('channels');
	const {
		control,
		register,
		formState: { errors },
	} = useFormContext<ChannelSpecFormValues>();
	const { fields, append, remove } = useFieldArray({ control, name: 'fields' });

	return (
		<FormField
			label={t('field_slack_fields')}
			tooltip={t('tooltip_slack_fields')}
		>
			<div>
				{fields.map((row, index) => (
					<RowEntry
						key={row.id}
						index={index}
						noun={t('entry_slack_field')}
						removeLabel={t('remove_slack_field')}
						removeTestId={`slack-field-remove-${index}`}
						onRemove={(): void => remove(index)}
					>
						<FormField
							label={t('label_slack_field_title')}
							tooltip={t('tooltip_slack_field_title')}
						>
							<Input
								{...register(`fields.${index}.title`)}
								placeholder={t('placeholder_slack_field_title')}
								testId={`slack-field-title-${index}`}
							/>
						</FormField>

						<FormField
							label={t('label_slack_field_value')}
							tooltip={t('tooltip_slack_field_value')}
							error={errors.fields?.[index]?.value?.message}
						>
							<Input
								{...register(`fields.${index}.value`)}
								placeholder={t('placeholder_slack_field_value')}
								testId={`slack-field-value-${index}`}
							/>
						</FormField>

						<div className={styles.entryWide}>
							<Controller
								control={control}
								name={`fields.${index}.short`}
								render={({ field }): JSX.Element => (
									<Checkbox
										color="primary"
										value={!!field.value}
										onChange={(checked): void => field.onChange(checked === true)}
										testId={`slack-field-short-${index}`}
									>
										<Typography.Text size="sm">
											{t('field_slack_field_short')}
										</Typography.Text>
									</Checkbox>
								)}
							/>
						</div>
					</RowEntry>
				))}
			</div>

			<div className={styles.add}>
				<Button
					variant="dashed"
					color="secondary"
					size="sm"
					prefix={<Plus size={14} />}
					onClick={(): void => append({ title: '', value: '', short: false })}
					testId="slack-field-add"
				>
					{t('add_slack_field')}
				</Button>
			</div>
		</FormField>
	);
}

export default SlackFields;
