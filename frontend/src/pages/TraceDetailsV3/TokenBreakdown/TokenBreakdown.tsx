import {
	AiTokenCounts,
	formatTokens,
	getTokenLabel,
	getTotalInputTokens,
	hasValue,
} from '../utils/genAi';
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
	const cacheRows = (
		<>
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
		</>
	);
	const reasoningSection = (hasValue(input) || hasValue(output)) && (
		<TraceTooltipSection>
			<TraceTooltipRow
				label={getTokenLabel('Reasoning', reasoning)}
				value={formatTokens(reasoning)}
				isHeading
			/>
		</TraceTooltipSection>
	);
	const outputSection = hasValue(output) && (
		<TraceTooltipSection>
			<TraceTooltipRow
				label={getTokenLabel('Output', output)}
				value={formatTokens(output)}
				isHeading
			/>
		</TraceTooltipSection>
	);
	const renderTotalUsage = (inputTotal: number): JSX.Element | false =>
		(hasValue(input) || hasValue(output)) && (
			<TraceTooltipSection>
				<TraceTooltipRow
					label="Total Token Usage"
					value={formatTokens(inputTotal + (output ?? 0))}
					isHeading
				/>
			</TraceTooltipSection>
		);

	// Without input there is no total to nest cache under.
	if (!hasValue(totalInput)) {
		return (
			<>
				{hasValue(input) && (
					<TraceTooltipSection>
						<TraceTooltipRow
							label={getTokenLabel('Input', input)}
							value={formatTokens(input)}
							isHeading
						/>
					</TraceTooltipSection>
				)}

				<TraceTooltipSection>
					<TraceTooltipRow label="Cache Tokens" isHeading />
					{cacheRows}
				</TraceTooltipSection>

				{reasoningSection}
				{outputSection}
				{renderTotalUsage(0)}
			</>
		);
	}

	return (
		<>
			<TraceTooltipSection>
				<TraceTooltipRow
					label={getTokenLabel('Total Input', totalInput)}
					value={formatTokens(totalInput)}
					isHeading
				/>
				{cacheRows}
				{hasValue(input) && (
					<TraceTooltipRow
						label={getTokenLabel('Input', input)}
						value={formatTokens(input)}
						isNested
					/>
				)}
			</TraceTooltipSection>

			{reasoningSection}
			{outputSection}
			{renderTotalUsage(totalInput)}
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
