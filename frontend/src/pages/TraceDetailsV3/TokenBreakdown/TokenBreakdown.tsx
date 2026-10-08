import { AiTokenCounts, formatTokens, hasValue } from '../utils/genAi';
import TraceTooltipRow from '../TraceTooltip/TraceTooltipRow';
import TraceTooltipSection from '../TraceTooltip/TraceTooltipSection';

type TokenBreakdownProps = Omit<AiTokenCounts, 'reasoning'>;

function TokenBreakdown({
	totalInput,
	input,
	output,
	cacheRead,
	cacheWrite,
}: TokenBreakdownProps): JSX.Element {
	const showCacheRead = hasValue(cacheRead);
	const showCacheWrite = hasValue(cacheWrite);
	const cacheRows = (
		<>
			{showCacheRead && (
				<TraceTooltipRow
					label="Cache Read"
					value={formatTokens(cacheRead)}
					isNested
				/>
			)}
			{showCacheWrite && (
				<TraceTooltipRow
					label="Cache Write"
					value={formatTokens(cacheWrite)}
					isNested
				/>
			)}
		</>
	);
	const outputSection = hasValue(output) && (
		<TraceTooltipSection>
			<TraceTooltipRow label="Output" value={formatTokens(output)} isHeading />
		</TraceTooltipSection>
	);

	// Without totalInput the cache mode is unknown, so cache can't be shown as part of input.
	if (!hasValue(totalInput)) {
		return (
			<>
				{hasValue(input) && (
					<TraceTooltipSection>
						<TraceTooltipRow label="Input" value={formatTokens(input)} isHeading />
					</TraceTooltipSection>
				)}
				{(showCacheRead || showCacheWrite) && (
					<TraceTooltipSection>
						<TraceTooltipRow label="Cache" isHeading />
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
				<TraceTooltipRow label="Input" value={formatTokens(totalInput)} isHeading />
				{cacheRows}
				{hasValue(input) && (
					<TraceTooltipRow label="Input" value={formatTokens(input)} isNested />
				)}
			</TraceTooltipSection>
			{outputSection}
			{hasValue(output) && (
				<TraceTooltipSection>
					<TraceTooltipRow
						label="Total"
						value={formatTokens(totalInput + output)}
						isHeading
					/>
				</TraceTooltipSection>
			)}
		</>
	);
}

TokenBreakdown.defaultProps = {
	totalInput: undefined,
	input: undefined,
	output: undefined,
	cacheRead: undefined,
	cacheWrite: undefined,
};

export default TokenBreakdown;
