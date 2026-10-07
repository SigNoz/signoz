import {
	formatCost,
	formatTokens,
	getUsageTotals,
	SpanAiUsage,
} from './aiUsage';
import TooltipRow from '../TraceTooltip/TooltipRow';
import TooltipSection from '../TraceTooltip/TooltipSection';

interface SpanUsageBreakdownProps {
	usage: SpanAiUsage;
}

function SpanUsageBreakdown({ usage }: SpanUsageBreakdownProps): JSX.Element {
	const { outputTokens = 0, cacheReadTokens, cacheCreationTokens, cost } = usage;
	const { inputUsage, totalUsage } = getUsageTotals(usage);

	return (
		<>
			<TooltipSection>
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
			</TooltipSection>
			<TooltipSection>
				<TooltipRow
					label="Output usage"
					value={formatTokens(outputTokens)}
					isTotal
				/>
			</TooltipSection>
			<TooltipSection>
				<TooltipRow label="Total usage" value={formatTokens(totalUsage)} isTotal />
				{cost !== undefined && <TooltipRow label="cost" value={formatCost(cost)} />}
			</TooltipSection>
		</>
	);
}

export default SpanUsageBreakdown;
