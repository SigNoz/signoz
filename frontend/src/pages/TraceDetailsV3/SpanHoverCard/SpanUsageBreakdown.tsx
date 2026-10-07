import { formatCost } from '../utils/genAi';
import { SpanAiUsage } from './aiUsage';
import TokenBreakdown from '../TraceTooltip/TokenBreakdown';
import TooltipRow from '../TraceTooltip/TooltipRow';
import TooltipSection from '../TraceTooltip/TooltipSection';

interface SpanUsageBreakdownProps {
	usage: SpanAiUsage;
}

function SpanUsageBreakdown({ usage }: SpanUsageBreakdownProps): JSX.Element {
	const {
		inputTokens,
		outputTokens,
		cacheReadTokens,
		cacheCreationTokens,
		cost,
	} = usage;

	return (
		<>
			<TokenBreakdown
				input={inputTokens}
				output={outputTokens}
				cacheRead={cacheReadTokens}
				cacheWrite={cacheCreationTokens}
			/>
			{cost !== undefined && (
				<TooltipSection>
					<TooltipRow label="cost" value={formatCost(cost)} />
				</TooltipSection>
			)}
		</>
	);
}

export default SpanUsageBreakdown;
