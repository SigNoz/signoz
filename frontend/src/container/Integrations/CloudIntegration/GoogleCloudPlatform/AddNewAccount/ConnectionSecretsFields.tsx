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

import { GcpSetupFormValues } from './types';
import styles from './ConnectionSecretsFields.module.scss';

type CredentialField = keyof CloudintegrationtypesCredentialsDTO;

interface FieldConfig {
	name: CredentialField;
	label: string;
	placeholder: string;
	testId: string;
}

const FIELDS: FieldConfig[] = [
	{
		name: 'sigNozApiUrl',
		label: 'SigNoz API URL',
		placeholder: 'https://<tenant>.signoz.cloud',
		testId: 'gcp-signoz-api-url-input',
	},
	{
		name: 'sigNozApiKey',
		label: 'SigNoz API Key',
		placeholder: 'Enter SigNoz API key',
		testId: 'gcp-signoz-api-key-input',
	},
	{
		name: 'ingestionUrl',
		label: 'Ingestion URL',
		placeholder: 'https://ingest.<region>.signoz.cloud',
		testId: 'gcp-ingestion-url-input',
	},
	{
		name: 'ingestionKey',
		label: 'Ingestion Key',
		placeholder: 'Enter ingestion key',
		testId: 'gcp-ingestion-key-input',
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
				{hasMissingValue && (
					<span className={styles.headLabel}>
						<Lock size={12} />
						Auto-filled by SigNoz
					</span>
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
									<label htmlFor={field.testId}>{field.label}</label>
									<div className={styles.readonlyField}>
										<span
											id={field.testId}
											className={cx(styles.readonlyValue, styles.mono)}
											title={providedValue}
											data-testid={field.testId}
										>
											{providedValue}
										</span>
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
								<label htmlFor={field.testId}>{field.label}</label>
								<Controller
									name={field.name}
									control={control}
									render={({ field: rhfField }): JSX.Element => (
										<Input
											id={field.testId}
											className={cx(styles.fullWidth, styles.mono)}
											placeholder={field.placeholder}
											value={rhfField.value}
											onChange={(e): void => rhfField.onChange(e.target.value)}
											testId={field.testId}
										/>
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
