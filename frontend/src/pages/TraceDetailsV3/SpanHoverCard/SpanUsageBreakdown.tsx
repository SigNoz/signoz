import { formatCost, hasValue } from '../utils/genAi';
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
			{hasValue(cost) && (
				<TraceTooltipSection>
					<TraceTooltipRow isHeading label="Cost" value={formatCost(cost)} />
				</TraceTooltipSection>
			)}
		</>
	);
}

export default SpanUsageBreakdown;
