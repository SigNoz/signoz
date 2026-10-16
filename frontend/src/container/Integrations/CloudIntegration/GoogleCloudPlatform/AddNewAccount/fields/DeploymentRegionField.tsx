import { ComboboxSimple } from '@signozhq/ui/combobox';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
import { GCP_REGIONS } from 'container/Integrations/constants';
import { Control, Controller } from 'react-hook-form';

import FieldLabel from '../FieldLabel';
import { GcpSetupFormValues } from '../types';

import styles from './Fields.module.scss';

const REGION_ITEMS = GCP_REGIONS.map((region) => ({
	value: region.value,
	label: `${region.label} (${region.value})`,
}));

interface DeploymentRegionFieldProps {
	control: Control<GcpSetupFormValues>;
	tooltip: string;
}

function DeploymentRegionField({
	control,
	tooltip,
}: DeploymentRegionFieldProps): JSX.Element {
	return (
		<div className={styles.drawerSection}>
			<FieldLabel
				htmlFor="gcp-deployment-region-select"
				label="Deployment Region"
				tooltip={tooltip}
				required
			/>
			<Controller
				name="deploymentRegion"
				control={control}
				rules={{ required: 'Please select a region' }}
				render={({ field, fieldState }): JSX.Element => (
					<>
						<ComboboxSimple
							id="gcp-deployment-region-select"
							className={cx(styles.fullWidth, styles.regionSelect, {
								[styles.regionEmpty]: !field.value,
							})}
							items={REGION_ITEMS}
							value={field.value}
							onChange={(value): void => field.onChange(value as string)}
							placeholder="Select a region..."
							inputPlaceholder="Search regions…"
							withPortal={false}
							testId="gcp-deployment-region-select"
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

export default DeploymentRegionField;
