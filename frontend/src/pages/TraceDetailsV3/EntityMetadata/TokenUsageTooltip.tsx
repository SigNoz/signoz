import { Typography } from '@signozhq/ui/typography';

import TokenBreakdown from '../TooltipPrimitives/TokenBreakdown';
import { AiTokenCounts } from '../utils/genAi';

import styles from './EntityMetadataRow.module.scss';

interface TokenUsageTooltipProps {
	tokens: AiTokenCounts;
}

function TokenUsageTooltip({ tokens }: TokenUsageTooltipProps): JSX.Element {
	const { totalInput, input, output, cacheRead, cacheWrite } = tokens;

	return (
		<div className={styles.tokenTooltip}>
			<Typography.Text
				size="small"
				weight="medium"
				className={styles.tokenTooltipTitle}
			>
				Usage Breakdown
			</Typography.Text>
			<TokenBreakdown
				totalInput={totalInput}
				input={input}
				output={output}
				cacheRead={cacheRead}
				cacheWrite={cacheWrite}
			/>
		</div>
	);
}

export default TokenUsageTooltip;
