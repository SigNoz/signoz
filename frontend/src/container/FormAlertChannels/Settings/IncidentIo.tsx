import { Dispatch, SetStateAction, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus } from '@signozhq/icons';
import { Button, Form, Input } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import { IncidentIOChannel } from '../../CreateAlertChannels/config';

interface MetadataRow {
	key: string;
	value: string;
}

function IncidentIOSettings({
	setSelectedConfig,
	initialMetadata,
}: IncidentIOProps): JSX.Element {
	const { t } = useTranslation('channels');
	const [metadataRows, setMetadataRows] = useState<MetadataRow[]>(() =>
		Object.entries(initialMetadata || {}).map(([key, value]) => ({
			key,
			value,
		})),
	);

	const update = (patch: Partial<IncidentIOChannel>): void =>
		setSelectedConfig((value) => ({ ...value, ...patch }));

	const syncMetadata = (rows: MetadataRow[]): void => {
		setMetadataRows(rows);
		update({
			metadata: Object.fromEntries(
				rows
					.filter((row) => row.key.trim() !== '')
					.map((row) => [row.key, row.value]),
			),
		});
	};

	return (
		<>
			<Typography.Text
				color="muted"
				size="sm"
				testId="incidentio-tip"
				style={{ display: 'block', marginBottom: 16 }}
			>
				{t('incidentio_tip')}{' '}
				<Typography.Link
					href="https://signoz.io/docs/alerts-management/notification-channel/incidentio/"
					target="_blank"
					rel="noopener noreferrer"
				>
					{t('incidentio_tip_link')}
				</Typography.Link>
			</Typography.Text>

			<Form.Item
				name="url"
				label={t('field_incidentio_url')}
				help={t('help_incidentio_url')}
				required
			>
				<Input
					onChange={(event): void => update({ url: event.target.value })}
					data-testid="incidentio-url-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="token"
				label={t('field_incidentio_token')}
				help={t('help_incidentio_token')}
				required
			>
				<Input
					type="password"
					onChange={(event): void => update({ token: event.target.value })}
					data-testid="incidentio-token-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="title"
				label={t('field_incidentio_title')}
				help={t('help_incidentio_title')}
			>
				<Input.TextArea
					rows={2}
					onChange={(event): void => update({ title: event.target.value })}
					data-testid="incidentio-title-textarea"
				/>
			</Form.Item>

			<Form.Item
				name="description"
				label={t('field_incidentio_description')}
				help={t('help_incidentio_description')}
			>
				<Input.TextArea
					rows={6}
					onChange={(event): void => update({ description: event.target.value })}
					data-testid="incidentio-description-textarea"
				/>
			</Form.Item>

			<Form.Item
				label={t('field_incidentio_metadata')}
				help={t('help_incidentio_metadata')}
			>
				{metadataRows.map((row, index) => (
					// rows have no stable identity beyond their position
					// eslint-disable-next-line react/no-array-index-key
					<div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
						<Input
							placeholder={t('placeholder_incidentio_metadata_key')}
							value={row.key}
							onChange={(event): void =>
								syncMetadata(
									metadataRows.map((r, i) =>
										i === index ? { ...r, key: event.target.value } : r,
									),
								)
							}
							data-testid={`incidentio-metadata-key-${index}`}
						/>
						<Input
							placeholder={t('placeholder_incidentio_metadata_value')}
							value={row.value}
							onChange={(event): void =>
								syncMetadata(
									metadataRows.map((r, i) =>
										i === index ? { ...r, value: event.target.value } : r,
									),
								)
							}
							data-testid={`incidentio-metadata-value-${index}`}
						/>
						<Button
							icon={<Minus size={14} />}
							onClick={(): void =>
								syncMetadata(metadataRows.filter((_, i) => i !== index))
							}
							data-testid={`incidentio-metadata-remove-${index}`}
						/>
					</div>
				))}
				<Button
					type="dashed"
					icon={<Plus size={14} />}
					onClick={(): void =>
						syncMetadata([...metadataRows, { key: '', value: '' }])
					}
					data-testid="incidentio-metadata-add"
				>
					{t('button_incidentio_add_metadata')}
				</Button>
			</Form.Item>
		</>
	);
}

interface IncidentIOProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<IncidentIOChannel>>>;
	initialMetadata?: Record<string, string>;
}

IncidentIOSettings.defaultProps = {
	initialMetadata: undefined,
};

export default IncidentIOSettings;
