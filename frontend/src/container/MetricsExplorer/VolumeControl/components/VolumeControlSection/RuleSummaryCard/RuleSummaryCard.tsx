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
				<Typography
					variant="paragraph"
					size="base"
					weight="bold"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					{rule.active
						? 'Aggregation rule active'
						: 'Aggregation rule pending activation'}
				</Typography>
				{canManage && (
					<Button
						size="md"
						variant="ghost"
						color="secondary"
						onClick={onEdit}
						testId="volume-control-edit"
					>
						Edit
					</Button>
				)}
			</div>
			<Typography
				variant="paragraph"
				size="small"
				weight="regular"
				color="secondary"
				as="div"
				display="inline"
				textOverflow="wrap"
			>
				{getMatchTypeLabel(rule.matchType)}
			</Typography>
			<div className={styles.chips}>
				{(rule.labels ?? []).map((label) => (
					<span className={styles.labelChip} key={label}>
						<Typography
							variant="code"
							size="small"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
						>
							{getLabelVerb(rule.matchType)} {label}
						</Typography>
					</span>
				))}
			</div>
		</div>
	);
}

export default RuleSummaryCard;
