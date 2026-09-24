import { Dispatch, SetStateAction, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus } from '@signozhq/icons';
import { Button, Checkbox, Form, Input } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { AlertmanagertypesChannelSlackFieldDTO } from 'api/generated/services/sigNoz.schemas';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';

interface SlackFieldsProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<ChannelSpecFormValues>>>;
	initialFields?: AlertmanagertypesChannelSlackFieldDTO[];
}

// Slack renders these as the attachment's table of short or full-width entries.
function SlackFields({
	setSelectedConfig,
	initialFields,
}: SlackFieldsProps): JSX.Element {
	const { t } = useTranslation('channels');
	const [rows, setRows] = useState<AlertmanagertypesChannelSlackFieldDTO[]>(
		() => initialFields ?? [],
	);

	const sync = (next: AlertmanagertypesChannelSlackFieldDTO[]): void => {
		setRows(next);
		setSelectedConfig((value) => ({
			...value,
			fields: next.filter((row) => row.title.trim() !== ''),
		}));
	};

	const updateRow = (
		index: number,
		patch: Partial<AlertmanagertypesChannelSlackFieldDTO>,
	): void =>
		sync(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

	return (
		<Form.Item label={t('field_slack_fields')} help={t('help_slack_fields')}>
			{rows.map((row, index) => (
				// the rows have no stable id, and reordering is not offered
				// eslint-disable-next-line react/no-array-index-key
				<div key={index} className="slack-fields-row">
					<Input
						value={row.title}
						placeholder={t('placeholder_slack_field_title')}
						onChange={(event): void =>
							updateRow(index, { title: event.target.value })
						}
						data-testid={`slack-field-title-${index}`}
					/>
					<Input
						value={row.value}
						placeholder={t('placeholder_slack_field_value')}
						onChange={(event): void =>
							updateRow(index, { value: event.target.value })
						}
						data-testid={`slack-field-value-${index}`}
					/>
					<Checkbox
						checked={!!row.short}
						onChange={(event): void =>
							updateRow(index, { short: event.target.checked })
						}
						data-testid={`slack-field-short-${index}`}
					>
						<Typography.Text size="sm">
							{t('field_slack_field_short')}
						</Typography.Text>
					</Checkbox>
					<Button
						type="text"
						icon={<Minus size={14} />}
						aria-label={t('remove_slack_field')}
						onClick={(): void => sync(rows.filter((_, i) => i !== index))}
						data-testid={`slack-field-remove-${index}`}
					/>
				</div>
			))}
			<Button
				type="dashed"
				icon={<Plus size={14} />}
				onClick={(): void =>
					sync([...rows, { title: '', value: '', short: false }])
				}
				data-testid="slack-field-add"
			>
				{t('add_slack_field')}
			</Button>
		</Form.Item>
	);
}

export default SlackFields;
