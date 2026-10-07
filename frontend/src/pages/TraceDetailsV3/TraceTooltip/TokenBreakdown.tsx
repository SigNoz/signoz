import { formatTokens } from '../SpanHoverCard/aiUsage';
import TooltipRow from './TooltipRow';
import TooltipSection from './TooltipSection';

interface TokenBreakdownProps {
	input?: number;
	output?: number;
	cacheRead?: number;
	cacheWrite?: number;
}

function TokenBreakdown({
	input,
	output,
	cacheRead,
	cacheWrite,
}: TokenBreakdownProps): JSX.Element {
	const showCacheRead = !!cacheRead;
	const showCacheWrite = !!cacheWrite;

	return (
		<>
			{input !== undefined && (
				<TooltipSection>
					<TooltipRow label="Input" value={formatTokens(input)} />
				</TooltipSection>
			)}
			{(showCacheRead || showCacheWrite) && (
				<TooltipSection>
					<TooltipRow label="Cache" />
					{showCacheRead && (
						<TooltipRow label="Cache read" value={formatTokens(cacheRead)} isNested />
					)}
					{showCacheWrite && (
						<TooltipRow
							label="Cache write"
							value={formatTokens(cacheWrite)}
							isNested
						/>
					)}
				</TooltipSection>
			)}
			{output !== undefined && (
				<TooltipSection>
					<TooltipRow label="Output" value={formatTokens(output)} />
				</TooltipSection>
			)}
		</>
	);
}

TokenBreakdown.defaultProps = {
	input: undefined,
	output: undefined,
	cacheRead: undefined,
	cacheWrite: undefined,
};

export default TokenBreakdown;
