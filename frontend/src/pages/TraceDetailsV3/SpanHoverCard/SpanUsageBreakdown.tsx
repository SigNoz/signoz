import { formatCost } from '../utils/genAi';
import { SpanAiUsage } from './aiUsage';
import TokenBreakdown from '../TokenBreakdown/TokenBreakdown';
import TraceTooltipRow from '../TraceTooltip/TraceTooltipRow';
import TraceTooltipSection from '../TraceTooltip/TraceTooltipSection';

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
				<TraceTooltipSection>
					<TraceTooltipRow label="cost" value={formatCost(cost)} />
				</TraceTooltipSection>
			)}
		</>
	);
}

export default SpanUsageBreakdown;
