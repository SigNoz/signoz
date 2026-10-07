import { formatTokens } from '../SpanHoverCard/aiUsage';
import TooltipRow from '../TraceTooltip/TooltipRow';
import TooltipSection from '../TraceTooltip/TooltipSection';
import type { SpantypesTraceAITokensDTO } from 'api/generated/services/sigNoz.schemas';

import tooltipStyles from '../TraceTooltip/TraceTooltip.module.scss';
import styles from './EntityMetadataRow.module.scss';

interface TokenUsageTooltipProps {
	tokens: SpantypesTraceAITokensDTO;
}

function TokenUsageTooltip({ tokens }: TokenUsageTooltipProps): JSX.Element {
	const { input, output, cacheRead, cacheWrite, reasoning } = tokens;

	return (
		<div className={`${tooltipStyles.body} ${styles.tokenTooltip}`}>
			<TooltipSection>
				<TooltipRow label="Tokens" value={formatTokens(input + output)} isTotal />
			</TooltipSection>
			<TooltipSection>
				<TooltipRow label="Input" value={formatTokens(input)} />
				<TooltipRow label="Output" value={formatTokens(output)} />
				{cacheRead !== undefined && (
					<TooltipRow label="Cache read" value={formatTokens(cacheRead)} />
				)}
				{cacheWrite !== undefined && (
					<TooltipRow label="Cache write" value={formatTokens(cacheWrite)} />
				)}
				{reasoning !== undefined && (
					<TooltipRow label="Reasoning" value={formatTokens(reasoning)} />
				)}
			</TooltipSection>
		</div>
	);
}

export default TokenUsageTooltip;
