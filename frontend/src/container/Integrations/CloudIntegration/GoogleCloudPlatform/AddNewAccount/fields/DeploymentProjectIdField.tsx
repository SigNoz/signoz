import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';
import { CloudintegrationtypesGCPConnectionMethodDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import { Control, Controller } from 'react-hook-form';

import FieldLabel from '../FieldLabel';
import { GcpSetupFormValues } from '../types';

import styles from './Fields.module.scss';

const TOOLTIPS: Record<CloudintegrationtypesGCPConnectionMethodDTO, string> = {
	[CloudintegrationtypesGCPConnectionMethodDTO.manual]:
		'The GCP project that hosts your OTel Collector deployment, often separate from the projects you actually monitor',
	[CloudintegrationtypesGCPConnectionMethodDTO.agent]:
		'The GCP project where SigNoz deploys the agent. The agent monitors this project.',
};

interface DeploymentProjectIdFieldProps {
	control: Control<GcpSetupFormValues>;
	connectionMethod: CloudintegrationtypesGCPConnectionMethodDTO;
}

function DeploymentProjectIdField({
	control,
	connectionMethod,
}: DeploymentProjectIdFieldProps): JSX.Element {
	return (
		<div className={styles.drawerSection}>
			<FieldLabel
				htmlFor="gcp-deployment-project-id-input"
				label="Deployment Project ID"
				tooltip={TOOLTIPS[connectionMethod]}
				required
			/>
			<Controller
				name="deploymentProjectId"
				control={control}
				rules={{ required: 'Please enter the deployment project ID' }}
				render={({ field, fieldState }): JSX.Element => (
					<>
						<Input
							id="gcp-deployment-project-id-input"
							className={cx(styles.fullWidth, styles.mono)}
							placeholder="e.g. my-deployment-project-123"
							value={field.value}
							onChange={(e): void => field.onChange(e.target.value)}
							testId="gcp-deployment-project-id-input"
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
}

export default DeploymentProjectIdField;
