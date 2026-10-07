import TokenBreakdown from '../TraceTooltip/TokenBreakdown';
import type { SpantypesTraceAITokensDTO } from 'api/generated/services/sigNoz.schemas';

import tooltipStyles from '../TraceTooltip/TraceTooltip.module.scss';
import styles from './EntityMetadataRow.module.scss';

interface TokenUsageTooltipProps {
	tokens: SpantypesTraceAITokensDTO;
}

function TokenUsageTooltip({ tokens }: TokenUsageTooltipProps): JSX.Element {
	const { input, output, cacheRead, cacheWrite } = tokens;

	return (
		<div className={`${tooltipStyles.body} ${styles.tokenTooltip}`}>
			<TokenBreakdown
				input={input}
				output={output}
				cacheRead={cacheRead}
				cacheWrite={cacheWrite}
			/>
		</div>
	);
}

export default TokenUsageTooltip;
