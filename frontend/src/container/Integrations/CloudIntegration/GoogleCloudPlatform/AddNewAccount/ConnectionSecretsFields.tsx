import { Lock } from '@signozhq/icons';
import { Input } from '@signozhq/ui/input';
import { toast } from '@signozhq/ui/toast';
import { Typography } from '@signozhq/ui/typography';
import { Skeleton } from 'antd';
import { CloudintegrationtypesCredentialsDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import CopyButton from 'periscope/components/CopyButton/CopyButton';
import { Control, Controller } from 'react-hook-form';

import FieldLabel from './FieldLabel';
import FormField from './FormField';
import { GcpSetupFormValues } from './types';
import { SecretFieldType, validateSecretValue } from './validators';
import styles from './ConnectionSecretsFields.module.scss';

type CredentialField = keyof CloudintegrationtypesCredentialsDTO;

interface FieldConfig {
	name: CredentialField;
	label: string;
	tooltip: string;
	placeholder: string;
	testId: string;
	type: SecretFieldType;
}

const FIELDS: FieldConfig[] = [
	{
		name: 'sigNozApiUrl',
		label: 'SigNoz API URL',
		tooltip: 'Base URL of your SigNoz instance the collector reports to',
		placeholder: 'https://<tenant>.signoz.cloud',
		testId: 'gcp-signoz-api-url-input',
		type: 'url',
	},
	{
		name: 'sigNozApiKey',
		label: 'SigNoz API Key',
		tooltip: 'API key used to authenticate with your SigNoz instance',
		placeholder: 'Enter SigNoz API key',
		testId: 'gcp-signoz-api-key-input',
		type: 'text',
	},
	{
		name: 'ingestionUrl',
		label: 'Ingestion URL',
		tooltip: 'OTLP ingestion endpoint your OTel Collector sends telemetry to',
		placeholder: 'https://ingest.<region>.signoz.cloud',
		testId: 'gcp-ingestion-url-input',
		type: 'url',
	},
	{
		name: 'ingestionKey',
		label: 'Ingestion Key',
		tooltip: 'Ingestion key that authorizes telemetry sent to SigNoz',
		placeholder: 'Enter ingestion key',
		testId: 'gcp-ingestion-key-input',
		type: 'text',
	},
];

interface ConnectionSecretsFieldsProps {
	control: Control<GcpSetupFormValues>;
	isLoading: boolean;
	connectionParams?: CloudintegrationtypesCredentialsDTO;
}

function ConnectionSecretsFields({
	control,
	isLoading,
	connectionParams,
}: ConnectionSecretsFieldsProps): JSX.Element {
	const hasMissingValue = FIELDS.some(
		(field) => !connectionParams?.[field.name],
	);

	return (
		<div className={styles.drawerSurface}>
			<div className={styles.drawerSurfaceHead}>
				<Typography
					variant="paragraph"
					size="base"
					weight="bold"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					Deployment details &amp; ingestion secrets
				</Typography>
				{!hasMissingValue && (
					<div className={styles.headLabel}>
						<Lock size={12} />
						<Typography
							variant="paragraph"
							size="small"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
						>
							Auto-filled by SigNoz
						</Typography>
					</div>
				)}
			</div>

			{isLoading ? (
				<div className={styles.secretsBody} data-testid="gcp-secrets-skeleton">
					{FIELDS.map((field) => (
						<div key={field.name} className={styles.drawerSection}>
							<Skeleton.Input active size="small" className={styles.skeletonLabel} />
							<Skeleton.Input active block className={styles.skeletonInput} />
						</div>
					))}
				</div>
			) : (
				<div className={styles.secretsBody}>
					{FIELDS.map((field) => {
						// Backend-provided values are read-only — the user can't edit them, so
						// show a truncated value with a copy button. Missing values (enterprise)
						// stay editable inputs with no copy button.
						const providedValue = connectionParams?.[field.name];
						if (providedValue) {
							return (
								<div key={field.name} className={styles.drawerSection}>
									<FieldLabel
										htmlFor={field.testId}
										label={field.label}
										tooltip={field.tooltip}
									/>
									<div className={styles.readonlyField}>
										<span
											className={cx(styles.readonlyValue, styles.mono)}
											title={providedValue}
										>
											<Typography
												/* TODO(typography): not lifted from className: composes: mono from './shared.module.scss' */ variant="paragraph"
												size="base"
												weight="regular"
												color="secondary"
												as="span"
												display="block"
												textOverflow="ellipsis"
												id={field.testId}
												testId={field.testId}
											>
												{providedValue}
											</Typography>
										</span>
										<CopyButton
											value={providedValue}
											size={12}
											ariaLabel={`Copy ${field.label}`}
											testId={`${field.testId}-copy`}
											onCopy={(): void => {
												toast.success(`${field.label} copied to clipboard`, {
													position: 'bottom-right',
												});
											}}
										/>
									</div>
								</div>
							);
						}

						return (
							<Controller
								key={field.name}
								name={field.name}
								control={control}
								rules={{
									validate: (value): true | string =>
										validateSecretValue(field.label, field.type, value),
								}}
								render={({ field: rhfField, fieldState }): JSX.Element => (
									<FormField
										htmlFor={field.testId}
										label={field.label}
										tooltip={field.tooltip}
										error={fieldState.error}
										className={styles.monoInput}
									>
										<Input
											id={field.testId}
											placeholder={field.placeholder}
											value={rhfField.value}
											onChange={(e): void => rhfField.onChange(e.target.value)}
											testId={field.testId}
										/>
									</FormField>
								)}
							/>
						);
					})}
				</div>
			)}
		</div>
	);
}

ConnectionSecretsFields.defaultProps = {
	connectionParams: undefined,
};

export default ConnectionSecretsFields;
