import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { MetricreductionruletypesGettableReductionRuleDTO } from 'api/generated/services/sigNoz.schemas';

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
					className={`${styles.statusDot} ${
						rule.active ? styles.statusActive : styles.statusPending
					}`}
				/>
				<Typography.Text className={styles.cardTitle}>
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
			<Typography.Text className={styles.mode}>
				{getMatchTypeLabel(rule.matchType)}
			</Typography.Text>
			<div className={styles.chips}>
				{(rule.labels ?? []).map((label) => (
					<span className={styles.chip} key={label}>
						{getLabelVerb(rule.matchType)} {label}
					</span>
				))}
			</div>
		</div>
	);
}

export default RuleSummaryCard;
