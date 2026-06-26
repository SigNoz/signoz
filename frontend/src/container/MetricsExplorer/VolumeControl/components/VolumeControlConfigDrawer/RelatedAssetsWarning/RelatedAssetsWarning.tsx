import { Info } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import {
	MetricreductionruletypesAffectedAssetDTO,
	MetricreductionruletypesAssetTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';

import styles from './RelatedAssetsWarning.module.scss';

const AssetType = MetricreductionruletypesAssetTypeDTO;

function assetHref(
	asset: MetricreductionruletypesAffectedAssetDTO,
): string | undefined {
	if (!asset.id) {
		return undefined;
	}
	if (asset.type === AssetType.dashboard) {
		const base = ROUTES.DASHBOARD.replace(':dashboardId', asset.id);
		return asset.widget?.id
			? `${base}?${QueryParams.expandedWidgetId}=${asset.widget.id}`
			: base;
	}
	if (asset.type === AssetType.alert_rule) {
		return `${ROUTES.EDIT_ALERTS}?ruleId=${asset.id}`;
	}
	return undefined;
}

interface RelatedAssetsWarningProps {
	affectedAssets?: MetricreductionruletypesAffectedAssetDTO[] | null;
}

function RelatedAssetsWarning({
	affectedAssets,
}: RelatedAssetsWarningProps): JSX.Element | null {
	const impacted = (affectedAssets ?? []).filter(
		(asset) =>
			asset.type === AssetType.alert_rule ||
			(asset.impactedLabels ?? []).length > 0,
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
			<div className={styles.warningBody}>
				<Typography.Text as="div" size="small" weight="semibold" color="warning">
					This rule affects {impacted.length} related asset
					{impacted.length > 1 ? 's' : ''}.
				</Typography.Text>
				{impactedLabels.length > 0 && (
					<Typography.Text as="div" size="sm" color="muted">
						{impactedLabels.join(', ')} will no longer be queryable; affected panels
						fall back to aggregated data once the rule applies.
					</Typography.Text>
				)}
				<ul className={styles.assetList}>
					{impacted.map((asset) => {
						const href = assetHref(asset);
						const label = `${asset.name}${
							asset.widget ? ` · ${asset.widget.name}` : ''
						}`;
						return (
							<li key={`${asset.type}-${asset.id}-${asset.widget?.id ?? ''}`}>
								{href ? (
									<Typography.Link
										size="sm"
										href={href}
										target="_blank"
										rel="noopener noreferrer"
									>
										{label}
									</Typography.Link>
								) : (
									<Typography.Text size="sm" color="muted">
										{label}
									</Typography.Text>
								)}
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}

export default RelatedAssetsWarning;
