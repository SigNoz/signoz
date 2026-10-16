import { Dispatch, SetStateAction, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Checkbox } from '@signozhq/ui/checkbox';
import { Input } from '@signozhq/ui/input';
import { Form } from 'antd';
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
						testId={`slack-field-title-${index}`}
					/>
					<Input
						value={row.value}
						placeholder={t('placeholder_slack_field_value')}
						onChange={(event): void =>
							updateRow(index, { value: event.target.value })
						}
						testId={`slack-field-value-${index}`}
					/>
					<Checkbox
						color="primary"
						value={!!row.short}
						onChange={(checked): void =>
							updateRow(index, { short: checked === true })
						}
						testId={`slack-field-short-${index}`}
					>
						<Typography.Text size="sm">
							{t('field_slack_field_short')}
						</Typography.Text>
					</Checkbox>
					<Button
						variant="ghost"
						color="secondary"
						size="sm"
						icon
						aria-label={t('remove_slack_field')}
						onClick={(): void => sync(rows.filter((_, i) => i !== index))}
						testId={`slack-field-remove-${index}`}
					>
						<Minus size={14} />
					</Button>
				</div>
			))}
			<Button
				variant="dashed"
				color="secondary"
				size="sm"
				prefix={<Plus size={14} />}
				onClick={(): void =>
					sync([...rows, { title: '', value: '', short: false }])
				}
				testId="slack-field-add"
			>
				{t('add_slack_field')}
			</Button>
		</Form.Item>
	);
}

export default SlackFields;
