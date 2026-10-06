import {
	formatCost,
	formatTokens,
	getUsageTotals,
	SpanAiUsage,
} from './aiUsage';
import TooltipRow from './TooltipRow';

import styles from './SpanHoverCard.module.scss';

interface SpanUsageBreakdownProps {
	usage: SpanAiUsage;
}

function SpanUsageBreakdown({ usage }: SpanUsageBreakdownProps): JSX.Element {
	const { outputTokens = 0, cacheReadTokens, cacheCreationTokens, cost } = usage;
	const { inputUsage, totalUsage } = getUsageTotals(usage);

	return (
		<>
			<div className={styles.section}>
				<TooltipRow label="Input usage" value={formatTokens(inputUsage)} isTotal />
				{cacheReadTokens !== undefined && (
					<TooltipRow label="cache read" value={formatTokens(cacheReadTokens)} />
				)}
				{cacheCreationTokens !== undefined && (
					<TooltipRow
						label="cache creation"
						value={formatTokens(cacheCreationTokens)}
					/>
				)}
			</div>
			<div className={styles.section}>
				<TooltipRow
					label="Output usage"
					value={formatTokens(outputTokens)}
					isTotal
				/>
			</div>
			<div className={styles.section}>
				<TooltipRow label="Total usage" value={formatTokens(totalUsage)} isTotal />
				{cost !== undefined && <TooltipRow label="cost" value={formatCost(cost)} />}
			</div>
		</>
	);
}

export default SpanUsageBreakdown;
