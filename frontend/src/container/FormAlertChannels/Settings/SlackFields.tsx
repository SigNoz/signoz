import { useTranslation } from 'react-i18next';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { Minus, Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Checkbox } from '@signozhq/ui/checkbox';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';
import FormField from '../FormField';
import styles from './RowEditor.module.scss';

// Slack renders these as the attachment's table of short or full-width entries.
function SlackFields(): JSX.Element {
	const { t } = useTranslation('channels');
	const { control, register } = useFormContext<ChannelSpecFormValues>();
	const { fields, append, remove } = useFieldArray({ control, name: 'fields' });

	return (
		<FormField label={t('field_slack_fields')} help={t('help_slack_fields')}>
			<div>
				{fields.map((row, index) => (
					<div key={row.id} className={styles.row}>
						<div className={styles.field}>
							<Input
								{...register(`fields.${index}.title`)}
								placeholder={t('placeholder_slack_field_title')}
								testId={`slack-field-title-${index}`}
							/>
						</div>
						<div className={styles.field}>
							<Input
								{...register(`fields.${index}.value`)}
								placeholder={t('placeholder_slack_field_value')}
								testId={`slack-field-value-${index}`}
							/>
						</div>
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
						<Button
							variant="ghost"
							color="secondary"
							size="sm"
							icon
							aria-label={t('remove_slack_field')}
							onClick={(): void => remove(index)}
							testId={`slack-field-remove-${index}`}
						>
							<Minus size={14} />
						</Button>
					</div>
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
