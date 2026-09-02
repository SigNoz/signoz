import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Collapse, Form, Input, Select } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import { JsmOpsChannel } from '../../CreateAlertChannels/config';

function JsmOpsSettings({ setSelectedConfig }: JsmOpsProps): JSX.Element {
	const { t } = useTranslation('channels');

	const update = (patch: Partial<JsmOpsChannel>): void =>
		setSelectedConfig((value) => ({ ...value, ...patch }));

	const advanced = (
		<>
			<Form.Item
				name="priority"
				label={t('field_jsmops_priority')}
				help={t('help_jsmops_priority')}
			>
				<Input.TextArea
					rows={2}
					onChange={(event): void => update({ priority: event.target.value })}
					data-testid="jsmops-priority-textarea"
				/>
			</Form.Item>

			<Form.Item
				name="tags"
				label={t('field_jsmops_tags')}
				help={t('help_jsmops_tags')}
			>
				<Select
					mode="tags"
					open={false}
					placeholder={t('placeholder_jsmops_tags')}
					onChange={(value): void => update({ tags: value as string[] })}
					data-testid="jsmops-tags-select"
				/>
			</Form.Item>
		</>
	);

	return (
		<>
			<Typography.Text
				color="muted"
				size="sm"
				testId="jsmops-tip"
				style={{ display: 'block', marginBottom: 16 }}
			>
				{t('jsmops_tip')}{' '}
				<Typography.Link
					href="https://signoz.io/docs/alerts-management/notification-channel/jsm-ops/"
					target="_blank"
					rel="noopener noreferrer"
				>
					{t('jsmops_tip_link')}
				</Typography.Link>
			</Typography.Text>

			<Form.Item
				name="api_key"
				label={t('field_jsmops_api_key')}
				help={t('help_jsmops_api_key')}
				required
			>
				<Input
					type="password"
					onChange={(event): void => update({ api_key: event.target.value })}
					data-testid="jsmops-api-key-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="message"
				label={t('field_jsmops_message')}
				help={t('help_jsmops_message')}
			>
				<Input.TextArea
					rows={2}
					onChange={(event): void => update({ message: event.target.value })}
					data-testid="jsmops-message-textarea"
				/>
			</Form.Item>

			<Form.Item
				name="description"
				label={t('field_jsmops_description')}
				help={t('help_jsmops_description')}
			>
				<Input.TextArea
					rows={6}
					onChange={(event): void => update({ description: event.target.value })}
					data-testid="jsmops-description-textarea"
				/>
			</Form.Item>

			<Collapse
				ghost
				items={[
					{
						key: 'advanced',
						label: t('jsmops_advanced_section'),
						children: advanced,
					},
				]}
			/>
		</>
	);
}

interface JsmOpsProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<JsmOpsChannel>>>;
}

export default JsmOpsSettings;
