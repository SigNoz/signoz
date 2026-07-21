import { useCallback } from 'react';
import { Copy, Lock } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { toast } from '@signozhq/ui/sonner';
import { Typography } from '@signozhq/ui/typography';
import { Skeleton } from 'antd';
import { CloudintegrationtypesCredentialsDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import { Control, Controller } from 'react-hook-form';
import { useCopyToClipboard } from 'react-use';

import FieldLabel from './FieldLabel';
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
	const [, copyToClipboard] = useCopyToClipboard();
	const hasMissingValue = FIELDS.some(
		(field) => !connectionParams?.[field.name],
	);

	const handleCopy = useCallback(
		(label: string, value: string): void => {
			copyToClipboard(value);
			toast.success(`${label} copied to clipboard`, { position: 'bottom-right' });
		},
		[copyToClipboard],
	);

	return (
		<div className={styles.drawerSurface}>
			<div className={styles.drawerSurfaceHead}>
				<Typography.Text weight="bold" size="base">
					Deployment details &amp; ingestion secrets
				</Typography.Text>
				{!hasMissingValue && (
					<div className={styles.headLabel}>
						<Lock size={12} />
						<Typography.Text as="span" size="small" className={styles.headLabel}>
							Auto-filled by SigNoz
						</Typography.Text>
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
										<Typography.Text
											as="span"
											id={field.testId}
											className={cx(styles.readonlyValue, styles.mono)}
											title={providedValue}
											testId={field.testId}
										>
											{providedValue}
										</Typography.Text>
										<Button
											type="button"
											size="sm"
											variant="ghost"
											color="secondary"
											aria-label={`Copy ${field.label}`}
											className={styles.copyBtn}
											onClick={(): void => handleCopy(field.label, providedValue)}
											data-testid={`${field.testId}-copy`}
										>
											<Copy size={12} />
										</Button>
									</div>
								</div>
							);
						}

						return (
							<div key={field.name} className={styles.drawerSection}>
								<FieldLabel
									htmlFor={field.testId}
									label={field.label}
									tooltip={field.tooltip}
								/>
								<Controller
									name={field.name}
									control={control}
									rules={{
										validate: (value): true | string =>
											validateSecretValue(field.label, field.type, value),
									}}
									render={({ field: rhfField, fieldState }): JSX.Element => (
										<>
											<Input
												id={field.testId}
												className={cx(styles.fullWidth, styles.mono)}
												placeholder={field.placeholder}
												value={rhfField.value}
												onChange={(e): void => rhfField.onChange(e.target.value)}
												testId={field.testId}
											/>
											{fieldState.error && (
												<Typography.Text
													as="span"
													size="small"
													role="alert"
													className={styles.fieldError}
												>
													{fieldState.error.message}
												</Typography.Text>
											)}
										</>
									)}
								/>
							</div>
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
