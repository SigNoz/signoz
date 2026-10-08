import { AiTokenCounts, formatTokens, hasValue } from '../utils/genAi';
import TooltipRow from '../TooltipPrimitives/TooltipRow';
import TooltipSection from '../TooltipPrimitives/TooltipSection';

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
				<TooltipRow label="Cache Read" value={formatTokens(cacheRead)} isNested />
			)}
			{showCacheWrite && (
				<TooltipRow label="Cache Write" value={formatTokens(cacheWrite)} isNested />
			)}
		</>
	);
	const outputSection = hasValue(output) && (
		<TooltipSection>
			<TooltipRow label="Output" value={formatTokens(output)} isHeading />
		</TooltipSection>
	);

	// Without totalInput the cache mode is unknown, so cache can't be shown as part of input.
	if (!hasValue(totalInput)) {
		return (
			<>
				{hasValue(input) && (
					<TooltipSection>
						<TooltipRow label="Input" value={formatTokens(input)} isHeading />
					</TooltipSection>
				)}
				{(showCacheRead || showCacheWrite) && (
					<TooltipSection>
						<TooltipRow label="Cache" isHeading />
						{cacheRows}
					</TooltipSection>
				)}
				{outputSection}
			</>
		);
	}

	return (
		<>
			<TooltipSection>
				<TooltipRow label="Input" value={formatTokens(totalInput)} isHeading />
				{cacheRows}
				{hasValue(input) && (
					<TooltipRow label="Input" value={formatTokens(input)} isNested />
				)}
			</TooltipSection>
			{outputSection}
			{hasValue(output) && (
				<TooltipSection>
					<TooltipRow
						label="Total"
						value={formatTokens(totalInput + output)}
						isHeading
					/>
				</TooltipSection>
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
