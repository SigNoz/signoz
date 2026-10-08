import { formatCost } from '../utils/genAi';
import { SpanAiUsage } from './aiUsage';
import TokenBreakdown from '../TokenBreakdown/TokenBreakdown';
import TooltipRow from '../TooltipPrimitives/TooltipRow';
import TooltipSection from '../TooltipPrimitives/TooltipSection';

interface SpanUsageBreakdownProps {
	usage: SpanAiUsage;
}

function SpanUsageBreakdown({ usage }: SpanUsageBreakdownProps): JSX.Element {
	const {
		totalInputTokens,
		inputTokens,
		outputTokens,
		cacheReadTokens,
		cacheCreationTokens,
		cost,
	} = usage;

	return (
		<>
			<TokenBreakdown
				totalInput={totalInputTokens}
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
