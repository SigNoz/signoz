import { useTranslation } from 'react-i18next';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { AlertmanagertypesChannelSlackActionDTO } from 'api/generated/services/sigNoz.schemas';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';
import FormField from '../FormField';
import RowEntry from './RowEntry';
import styles from './RowEditor.module.scss';

/** `confirm` is an object on the DTO, so its one editable field is reached by path. */
type ActionColumn =
	| Exclude<keyof AlertmanagertypesChannelSlackActionDTO, 'confirm' | 'short'>
	| 'confirm.text';

const COLUMNS = [
	'text',
	'url',
	'name',
	'value',
	'style',
	'confirm.text',
] as const satisfies readonly ActionColumn[];

function SlackActions(): JSX.Element {
	const { t } = useTranslation('channels');
	const {
		control,
		register,
		formState: { errors },
	} = useFormContext<ChannelSpecFormValues>();
	const { fields, append, remove } = useFieldArray({ control, name: 'actions' });

	const keyFor = (column: ActionColumn): string => column.replace('.text', '');

	return (
		<FormField
			label={t('field_slack_actions')}
			tooltip={t('tooltip_slack_actions')}
		>
			<div>
				{fields.map((row, index) => (
					<RowEntry
						key={row.id}
						index={index}
						noun={t('entry_slack_action')}
						removeLabel={t('remove_slack_action')}
						removeTestId={`slack-action-remove-${index}`}
						onRemove={(): void => remove(index)}
					>
						{COLUMNS.map((column) => (
							<FormField
								key={column}
								label={t(`label_slack_action_${keyFor(column)}`)}
								tooltip={t(`tooltip_slack_action_${keyFor(column)}`)}
								error={
									column === 'url' ? errors.actions?.[index]?.url?.message : undefined
								}
							>
								<Input
									{...register(`actions.${index}.${column}` as const)}
									placeholder={t(`placeholder_slack_action_${keyFor(column)}`)}
									testId={`slack-action-${keyFor(column)}-${index}`}
								/>
							</FormField>
						))}
					</RowEntry>
				))}
			</div>

			<div className={styles.add}>
				<Button
					variant="dashed"
					color="secondary"
					size="sm"
					prefix={<Plus size={14} />}
					onClick={(): void => append({ type: 'button', text: '', url: '' })}
					testId="slack-action-add"
				>
					{t('add_slack_action')}
				</Button>
			</div>
		</FormField>
	);
}

export default SlackActions;
