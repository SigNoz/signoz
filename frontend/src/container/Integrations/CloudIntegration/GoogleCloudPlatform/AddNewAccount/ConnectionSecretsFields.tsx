import { Info, Lock } from '@signozhq/icons';
import { Form, Input, Skeleton } from 'antd';
import { CloudintegrationtypesCredentialsDTO } from 'api/generated/services/sigNoz.schemas';

import styles from './CloudAccountSetupDrawer.module.scss';

const infoIcon = <Info size={13} />;

type CredentialField = keyof CloudintegrationtypesCredentialsDTO;

interface FieldConfig {
	name: CredentialField;
	label: string;
	tooltip: string;
	placeholder: string;
	testId: string;
}

// TODO(gcp): confirm final tooltip copy against the design artifact.
const FIELDS: FieldConfig[] = [
	{
		name: 'sigNozApiUrl',
		label: 'SigNoz API URL',
		tooltip: 'The SigNoz API URL used by the collector to reach your account.',
		placeholder: 'https://<tenant>.signoz.cloud',
		testId: 'gcp-signoz-api-url-input',
	},
	{
		name: 'sigNozApiKey',
		label: 'SigNoz API Key',
		tooltip: 'The SigNoz API key the collector authenticates with.',
		placeholder: 'Enter SigNoz API key',
		testId: 'gcp-signoz-api-key-input',
	},
	{
		name: 'ingestionUrl',
		label: 'Ingestion URL',
		tooltip: 'The endpoint the collector ships telemetry to.',
		placeholder: 'https://ingest.<region>.signoz.cloud',
		testId: 'gcp-ingestion-url-input',
	},
	{
		name: 'ingestionKey',
		label: 'Ingestion Key',
		tooltip: 'The ingestion key the collector authenticates with.',
		placeholder: 'Enter ingestion key',
		testId: 'gcp-ingestion-key-input',
	},
];

interface ConnectionSecretsFieldsProps {
	isLoading: boolean;
	connectionParams?: CloudintegrationtypesCredentialsDTO;
}

function ConnectionSecretsFields({
	isLoading,
	connectionParams,
}: ConnectionSecretsFieldsProps): JSX.Element {
	const hasMissingValue = FIELDS.some(
		(field) => !connectionParams?.[field.name],
	);

	return (
		<div className={styles.secretsSection}>
			<div className={styles.sectionHeader}>
				<Lock size={15} className={styles.sectionIcon} />
				<span className={styles.sectionTitle}>
					Deployment details &amp; ingestion secrets
				</span>
			</div>

			{isLoading ? (
				<div className={styles.secretsSkeleton} data-testid="gcp-secrets-skeleton">
					{FIELDS.map((field) => (
						<div key={field.name} className={styles.skeletonRow}>
							<Skeleton.Input active size="small" className={styles.skeletonLabel} />
							<Skeleton.Input active block className={styles.skeletonInput} />
						</div>
					))}
				</div>
			) : (
				<>
					{FIELDS.map((field) => {
						// If the backend already provides a value there is nothing to edit —
						// pre-fill and lock it. Otherwise let the user supply it (enterprise).
						const isProvidedByBackend = Boolean(connectionParams?.[field.name]);
						return (
							<Form.Item
								key={field.name}
								name={field.name}
								label={field.label}
								tooltip={{ title: field.tooltip, icon: infoIcon }}
								className={styles.formItem}
							>
								<Input
									size="large"
									className={styles.monoInput}
									placeholder={field.placeholder}
									disabled={isProvidedByBackend}
									data-testid={field.testId}
								/>
							</Form.Item>
						);
					})}

					{hasMissingValue && (
						<div className={styles.enterpriseCallout}>
							<Info size={15} className={styles.enterpriseIcon} />
							<span>
								Enterprise user? Fill in the missing deployment details and ingestion
								secrets above before connecting your account.
							</span>
						</div>
					)}
				</>
			)}
		</div>
	);
}

ConnectionSecretsFields.defaultProps = {
	connectionParams: undefined,
};

export default ConnectionSecretsFields;
