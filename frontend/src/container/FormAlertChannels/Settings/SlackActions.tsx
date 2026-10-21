import { useTranslation } from 'react-i18next';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Minus, Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';
import { AlertmanagertypesChannelSlackActionDTO } from 'api/generated/services/sigNoz.schemas';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';
import FormField from '../FormField';
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
	const { control, register } = useFormContext<ChannelSpecFormValues>();
	const { fields, append, remove } = useFieldArray({ control, name: 'actions' });

	const labelFor = (column: ActionColumn): string =>
		t(`label_slack_action_${column.replace('.text', '')}`);

	return (
		<FormField label={t('field_slack_actions')} help={t('help_slack_actions')}>
			<div>
				{fields.length > 0 && (
					<div className={styles.row}>
						{COLUMNS.map((column) => (
							<div key={column} className={styles.field}>
								<Typography.Text size="sm" className={styles.heading}>
									{labelFor(column)}
								</Typography.Text>
							</div>
						))}
					</div>
				)}

				{fields.map((row, index) => (
					<div key={row.id} className={styles.row}>
						{COLUMNS.map((column) => (
							<div key={column} className={styles.field}>
								<Input
									{...register(`actions.${index}.${column}` as const)}
									placeholder={t(
										`placeholder_slack_action_${column.replace('.text', '')}`,
									)}
									testId={`slack-action-${column.replace('.text', '')}-${index}`}
								/>
							</div>
						))}
						<Button
							variant="ghost"
							color="secondary"
							size="sm"
							icon
							aria-label={t('remove_slack_action')}
							onClick={(): void => remove(index)}
							testId={`slack-action-remove-${index}`}
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
