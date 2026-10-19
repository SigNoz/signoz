import {
	AiTokenCounts,
	formatTokens,
	getTokenLabel,
	getTotalInputTokens,
} from '../utils/aiTraceUtils';
import TraceTooltipRow from '../TraceTooltip/TraceTooltipRow';
import TraceTooltipSection from '../TraceTooltip/TraceTooltipSection';

type TokenBreakdownProps = AiTokenCounts;

function TokenBreakdown({
	input,
	output,
	cacheRead,
	cacheWrite,
	reasoning,
}: TokenBreakdownProps): JSX.Element {
	const totalInput = getTotalInputTokens({ input, cacheRead, cacheWrite });

	return (
		<>
			<TraceTooltipSection>
				<TraceTooltipRow
					label={getTokenLabel('Total Input', totalInput)}
					value={formatTokens(totalInput)}
					isHeading
				/>
				<TraceTooltipRow
					label={getTokenLabel('Cache Read', cacheRead)}
					value={formatTokens(cacheRead)}
					isNested
				/>
				<TraceTooltipRow
					label={getTokenLabel('Cache Write', cacheWrite)}
					value={formatTokens(cacheWrite)}
					isNested
				/>
				<TraceTooltipRow
					label={getTokenLabel('Input', input)}
					value={formatTokens(input)}
					isNested
				/>
			</TraceTooltipSection>

			<TraceTooltipSection>
				<TraceTooltipRow
					label={getTokenLabel('Reasoning', reasoning)}
					value={formatTokens(reasoning)}
					isHeading
				/>
			</TraceTooltipSection>

			<TraceTooltipSection>
				<TraceTooltipRow
					label={getTokenLabel('Output', output)}
					value={formatTokens(output)}
					isHeading
				/>
			</TraceTooltipSection>

			<TraceTooltipSection>
				<TraceTooltipRow
					label="Total Token Usage"
					value={formatTokens(totalInput + (output ?? 0))}
					isHeading
				/>
			</TraceTooltipSection>
		</>
	);
}

TokenBreakdown.defaultProps = {
	input: undefined,
	output: undefined,
	cacheRead: undefined,
	cacheWrite: undefined,
	reasoning: undefined,
};

export default TokenBreakdown;
