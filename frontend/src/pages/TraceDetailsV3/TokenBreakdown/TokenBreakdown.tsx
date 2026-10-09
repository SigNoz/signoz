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
	const showCacheRead = hasValue(cacheRead);
	const showCacheWrite = hasValue(cacheWrite);
	const cacheRows = (
		<>
			{showCacheRead && (
				<TraceTooltipRow
					label={getTokenLabel('Cache Read', cacheRead)}
					value={formatTokens(cacheRead)}
					isNested
				/>
			)}
			{showCacheWrite && (
				<TraceTooltipRow
					label={getTokenLabel('Cache Write', cacheWrite)}
					value={formatTokens(cacheWrite)}
					isNested
				/>
			)}
		</>
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
				{(showCacheRead || showCacheWrite) && (
					<TraceTooltipSection>
						<TraceTooltipRow label="Cache Tokens" isHeading />
						{cacheRows}
					</TraceTooltipSection>
				)}
				{outputSection}
			</>
		);
	}

	return (
		<>
			<TraceTooltipSection>
				<TraceTooltipRow
					label={getTokenLabel('Input', totalInput)}
					value={formatTokens(totalInput)}
					isHeading
				/>
				{cacheRows}
				{hasValue(input) && (
					<TraceTooltipRow
						label={getTokenLabel('Total Input', input)}
						value={formatTokens(input)}
						isNested
					/>
				)}
			</TraceTooltipSection>

			{hasValue(reasoning) && (
				<TraceTooltipSection>
					<TraceTooltipRow
						label={getTokenLabel('Reasoning', reasoning)}
						value={formatTokens(reasoning)}
						isHeading
					/>
				</TraceTooltipSection>
			)}
			{outputSection}
			{hasValue(output) && (
				<TraceTooltipSection>
					<TraceTooltipRow
						label="Total Token Usage"
						value={formatTokens(totalInput + output)}
						isHeading
					/>
				</TraceTooltipSection>
			)}
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
