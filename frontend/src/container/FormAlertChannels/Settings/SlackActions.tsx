import { Dispatch, SetStateAction, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus } from '@signozhq/icons';
import { Button, Form, Input } from 'antd';
import { AlertmanagertypesChannelSlackActionDTO } from 'api/generated/services/sigNoz.schemas';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';

interface SlackActionsProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<ChannelSpecFormValues>>>;
	initialActions?: AlertmanagertypesChannelSlackActionDTO[];
}

const emptyAction: AlertmanagertypesChannelSlackActionDTO = {
	type: 'button',
	text: '',
	url: '',
};

// Buttons Slack renders under the attachment. `type` and `text` are required by
// the API; a `button` carrying a url is the link-out case, the rest drive a
// Slack app's own callbacks.
function SlackActions({
	setSelectedConfig,
	initialActions,
}: SlackActionsProps): JSX.Element {
	const { t } = useTranslation('channels');
	const [rows, setRows] = useState<AlertmanagertypesChannelSlackActionDTO[]>(
		() => initialActions ?? [],
	);

	const sync = (next: AlertmanagertypesChannelSlackActionDTO[]): void => {
		setRows(next);
		setSelectedConfig((value) => ({
			...value,
			actions: next.filter((row) => row.text.trim() !== ''),
		}));
	};

	const updateRow = (
		index: number,
		patch: Partial<AlertmanagertypesChannelSlackActionDTO>,
	): void =>
		sync(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

	return (
		<Form.Item label={t('field_slack_actions')} help={t('help_slack_actions')}>
			{rows.map((row, index) => (
				// the rows have no stable id, and reordering is not offered
				// eslint-disable-next-line react/no-array-index-key
				<div key={index} className="slack-actions-row">
					<Input
						value={row.text}
						placeholder={t('placeholder_slack_action_text')}
						onChange={(event): void => updateRow(index, { text: event.target.value })}
						data-testid={`slack-action-text-${index}`}
					/>
					<Input
						value={row.url}
						placeholder={t('placeholder_slack_action_url')}
						onChange={(event): void => updateRow(index, { url: event.target.value })}
						data-testid={`slack-action-url-${index}`}
					/>
					<Input
						value={row.type}
						placeholder={t('placeholder_slack_action_type')}
						onChange={(event): void => updateRow(index, { type: event.target.value })}
						data-testid={`slack-action-type-${index}`}
					/>
					<Input
						value={row.name ?? ''}
						placeholder={t('placeholder_slack_action_name')}
						onChange={(event): void => updateRow(index, { name: event.target.value })}
						data-testid={`slack-action-name-${index}`}
					/>
					<Input
						value={row.value ?? ''}
						placeholder={t('placeholder_slack_action_value')}
						onChange={(event): void =>
							updateRow(index, { value: event.target.value })
						}
						data-testid={`slack-action-value-${index}`}
					/>
					<Input
						value={row.style ?? ''}
						placeholder={t('placeholder_slack_action_style')}
						onChange={(event): void =>
							updateRow(index, { style: event.target.value })
						}
						data-testid={`slack-action-style-${index}`}
					/>
					<Input
						value={row.confirm?.text ?? ''}
						placeholder={t('placeholder_slack_action_confirm')}
						onChange={(event): void =>
							updateRow(index, {
								confirm: event.target.value ? { text: event.target.value } : undefined,
							})
						}
						data-testid={`slack-action-confirm-${index}`}
					/>
					<Button
						type="text"
						icon={<Minus size={14} />}
						aria-label={t('remove_slack_action')}
						onClick={(): void => sync(rows.filter((_, i) => i !== index))}
						data-testid={`slack-action-remove-${index}`}
					/>
				</div>
			))}
			<Button
				type="dashed"
				icon={<Plus size={14} />}
				onClick={(): void => sync([...rows, { ...emptyAction }])}
				data-testid="slack-action-add"
			>
				{t('add_slack_action')}
			</Button>
		</Form.Item>
	);
}

export default SlackActions;
