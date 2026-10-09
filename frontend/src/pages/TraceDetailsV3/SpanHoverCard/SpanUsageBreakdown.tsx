import { SpanAiUsage } from './aiUsage';
import TokenBreakdown from '../TokenBreakdown/TokenBreakdown';

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
		<TokenBreakdown
			input={inputTokens}
			output={outputTokens}
			cacheRead={cacheReadTokens}
			cacheWrite={cacheCreationTokens}
			cost={cost}
		/>
	);
}

export default SpanUsageBreakdown;
