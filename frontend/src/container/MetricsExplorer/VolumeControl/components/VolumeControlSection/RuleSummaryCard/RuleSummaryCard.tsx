import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { MetricreductionruletypesGettableReductionRuleDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';

import { getLabelVerb, getMatchTypeLabel } from '../../../ruleUtils';
import styles from './RuleSummaryCard.module.scss';

interface RuleSummaryCardProps {
	rule: MetricreductionruletypesGettableReductionRuleDTO;
	canManage: boolean;
	onEdit: () => void;
}

function RuleSummaryCard({
	rule,
	canManage,
	onEdit,
}: RuleSummaryCardProps): JSX.Element {
	return (
		<div className={styles.card} data-testid="volume-control-active">
			<div className={styles.cardRow}>
				<span
					className={cx(
						styles.statusIndicator,
						rule.active ? styles.statusActive : styles.statusPending,
					)}
				/>
				<Typography.Text weight="semibold">
					{rule.active
						? 'Aggregation rule active'
						: 'Aggregation rule pending activation'}
				</Typography.Text>
				{canManage && (
					<Button
						variant="ghost"
						color="secondary"
						className={styles.editButton}
						onClick={onEdit}
						data-testid="volume-control-edit"
					>
						Edit
					</Button>
				)}
			</div>
			<Typography.Text as="div" size="small" color="muted">
				{getMatchTypeLabel(rule.matchType)}
			</Typography.Text>
			<div className={styles.chips}>
				{(rule.labels ?? []).map((label) => (
					<Typography.Text size="sm" className={styles.labelChip} key={label}>
						{getLabelVerb(rule.matchType)} {label}
					</Typography.Text>
				))}
			</div>
		</div>
	);
}

export default RuleSummaryCard;
