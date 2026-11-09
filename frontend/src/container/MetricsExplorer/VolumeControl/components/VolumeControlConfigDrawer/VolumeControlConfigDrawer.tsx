import { Button } from '@signozhq/ui/button';
import { Drawer } from '@signozhq/ui/drawer';
import { Typography } from '@signozhq/ui/typography';
import { MetricreductionruletypesGettableReductionRuleDTO } from 'api/generated/services/sigNoz.schemas';

import { useVolumeControlConfig } from '../../hooks/useVolumeControlConfig';
import ImpactPanel from './ImpactPanel/ImpactPanel';
import LabelSelector from './LabelSelector/LabelSelector';
import ModeSelector from './ModeSelector/ModeSelector';
import RelatedAssetsWarning from './RelatedAssetsWarning/RelatedAssetsWarning';
import styles from './VolumeControlConfigDrawer.module.scss';

interface VolumeControlConfigDrawerProps {
	metricName: string;
	existingRule: MetricreductionruletypesGettableReductionRuleDTO | null;
	open: boolean;
	onClose: () => void;
}

function VolumeControlConfigDrawer({
	metricName,
	existingRule,
	open,
	onClose,
}: VolumeControlConfigDrawerProps): JSX.Element {
	const {
		mode,
		setMode,
		labels,
		setLabels,
		attributeKeys,
		isLoadingAttributes,
		preview,
		isPreviewLoading,
		save,
		remove,
		isSaving,
		isRemoving,
		hasExistingRule,
		isSaveDisabled,
	} = useVolumeControlConfig({ metricName, existingRule, open, onClose });

	const footerStatus = (
		<Typography
			variant="paragraph"
			size="small"
			weight="regular"
			color="secondary"
			as="span"
			textOverflow="wrap"
		>
			Changes take effect about 5 minutes after saving.
		</Typography>
	);

	const footerActions = (
		<>
			<Button
				size="md"
				variant="outlined"
				color="secondary"
				onClick={onClose}
				testId="volume-control-cancel"
			>
				Cancel
			</Button>
			{hasExistingRule && (
				<Button
					size="md"
					variant="solid"
					color="danger"
					onClick={remove}
					loading={isRemoving}
					testId="volume-control-remove"
				>
					Remove rule
				</Button>
			)}
			<Button
				size="md"
				variant="solid"
				color="primary"
				onClick={save}
				disabled={isSaveDisabled}
				disabledTooltip="Select at least one attribute"
				loading={isSaving}
				testId="volume-control-save"
			>
				Save rule
			</Button>
		</>
	);

	return (
		<Drawer
			type="task"
			open={open}
			onClose={onClose}
			title={`Manage attributes · ${metricName}`}
			width="wide"
			footerPrefix={footerStatus}
			footerSuffix={footerActions}
		>
			<div className={styles.body} data-testid="volume-control-config-drawer">
				<div className={styles.adminRow}>
					<span className={styles.adminOnlyTag}>
						<Typography
							variant="paragraph"
							size="small"
							weight="bold"
							color="warning"
							as="span"
							textOverflow="wrap"
						>
							Admin only
						</Typography>
					</span>
				</div>
				<ModeSelector mode={mode} onChange={setMode} />
				{mode !== 'all' && (
					<LabelSelector
						mode={mode}
						options={attributeKeys}
						value={labels}
						onChange={setLabels}
						loading={isLoadingAttributes}
					/>
				)}
				<ImpactPanel mode={mode} preview={preview} isLoading={isPreviewLoading} />
				<RelatedAssetsWarning affectedAssets={preview?.affectedAssets} />
			</div>
		</Drawer>
	);
}

export default VolumeControlConfigDrawer;
