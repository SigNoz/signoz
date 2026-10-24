import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useFormContext } from 'react-hook-form';
import { Plus } from '@signozhq/icons';
import { Input } from '@signozhq/ui/input';
import { Button } from '@signozhq/ui/button';
import { Input as AntdInput } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';
import FormCard from '../FormCard';
import FormField from '../FormField';
import RowEntry from './RowEntry';
import styles from './RowEditor.module.scss';

const { TextArea } = AntdInput;

interface MetadataRow {
	key: string;
	value: string;
}

function IncidentIOSettings({ initialMetadata }: IncidentIOProps): JSX.Element {
	const { t } = useTranslation('channels');
	const {
		register,
		control,
		setValue,
		formState: { errors },
	} = useFormContext<ChannelSpecFormValues>();

	const [metadataRows, setMetadataRows] = useState<MetadataRow[]>(() =>
		Object.entries(initialMetadata || {}).map(([key, value]) => ({
			key,
			value,
		})),
	);

	// The API models metadata as a map, so the rows are held here rather than in
	// the form: an object loses their order and drops a key still being typed.
	const syncMetadata = (rows: MetadataRow[]): void => {
		setMetadataRows(rows);
		setValue(
			'metadata',
			Object.fromEntries(
				rows
					.filter((row) => row.key.trim() !== '')
					.map((row) => [row.key, row.value]),
			),
			{ shouldDirty: true },
		);
	};

	return (
		<>
			<FormCard title={t('section_connection')}>
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

				<FormField
					label={t('field_incidentio_url')}
					help={t('help_incidentio_url')}
					error={errors.url?.message}
					required
				>
					<Input
						{...register('url')}
						aria-required
						data-testid="incidentio-url-textbox"
					/>
				</FormField>

				<FormField
					label={t('field_incidentio_token')}
					help={t('help_incidentio_token')}
					error={errors.token?.message}
					required
				>
					<Input
						{...register('token')}
						aria-required
						type="password"
						data-testid="incidentio-token-textbox"
					/>
				</FormField>

				<FormField
					label={t('field_incidentio_title')}
					help={t('help_incidentio_title')}
					error={errors.title?.message}
				>
					<Controller
						control={control}
						name="title"
						render={({ field }): JSX.Element => (
							<TextArea
								rows={2}
								data-testid="incidentio-title-textarea"
								value={(field.value as string) ?? ''}
								onChange={field.onChange}
							/>
						)}
					/>
				</FormField>

				<FormField
					label={t('field_incidentio_description')}
					help={t('help_incidentio_description')}
					error={errors.description?.message}
				>
					<Controller
						control={control}
						name="description"
						render={({ field }): JSX.Element => (
							<TextArea
								rows={6}
								data-testid="incidentio-description-textarea"
								value={(field.value as string) ?? ''}
								onChange={field.onChange}
							/>
						)}
					/>
				</FormField>

				<FormField
					label={t('field_incidentio_metadata')}
					help={t('help_incidentio_metadata')}
				>
					{metadataRows.map((row, index) => (
						<RowEntry
							// rows have no stable identity beyond their position
							// eslint-disable-next-line react/no-array-index-key
							key={index}
							index={index}
							noun={t('entry_incidentio_metadata')}
							removeLabel={t('button_incidentio_remove_metadata')}
							removeTestId={`incidentio-metadata-remove-${index}`}
							onRemove={(): void =>
								syncMetadata(metadataRows.filter((_, i) => i !== index))
							}
						>
							<FormField label={t('label_incidentio_metadata_key')}>
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
							</FormField>

							<FormField label={t('label_incidentio_metadata_value')}>
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
							</FormField>
						</RowEntry>
					))}

					<div className={styles.add}>
						<Button
							variant="dashed"
							color="secondary"
							size="sm"
							prefix={<Plus size={14} />}
							onClick={(): void =>
								syncMetadata([...metadataRows, { key: '', value: '' }])
							}
							testId="incidentio-metadata-add"
						>
							{t('button_incidentio_add_metadata')}
						</Button>
					</div>
				</FormField>
			</FormCard>
		</>
	);
}

interface IncidentIOProps {
	initialMetadata?: Record<string, string>;
}

IncidentIOSettings.defaultProps = {
	initialMetadata: undefined,
};

export default IncidentIOSettings;
