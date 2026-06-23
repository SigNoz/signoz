import { Info } from '@signozhq/icons';
import { MetricreductionruletypesAffectedAssetDTO } from 'api/generated/services/sigNoz.schemas';

import styles from './VolumeControlConfig.module.scss';

interface RelatedAssetsWarningProps {
	affectedAssets?: MetricreductionruletypesAffectedAssetDTO[] | null;
}

function RelatedAssetsWarning({
	affectedAssets,
}: RelatedAssetsWarningProps): JSX.Element | null {
	const impacted = (affectedAssets ?? []).filter(
		(asset) => (asset.impactedLabels ?? []).length > 0,
	);
	if (impacted.length === 0) {
		return null;
	}

	const impactedLabels = Array.from(
		new Set(impacted.flatMap((asset) => asset.impactedLabels ?? [])),
	);

	return (
		<div className={styles.warning} data-testid="volume-control-warning">
			<Info size={14} />
			<div>
				<div className={styles.warningTitle}>
					This rule affects {impacted.length} related asset
					{impacted.length > 1 ? 's' : ''}.
				</div>
				{impactedLabels.length > 0 && (
					<div className={styles.warningDetail}>
						{impactedLabels.join(', ')} will no longer be queryable; affected panels
						fall back to aggregated data once the rule applies.
					</div>
				)}
				<ul className={styles.assetList}>
					{impacted.map((asset) => (
						<li key={`${asset.type}-${asset.id}`}>
							{asset.name}
							{asset.widget ? ` · ${asset.widget}` : ''}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

export default RelatedAssetsWarning;
