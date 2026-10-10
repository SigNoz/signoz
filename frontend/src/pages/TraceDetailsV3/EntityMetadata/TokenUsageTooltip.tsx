import { Typography } from '@signozhq/ui/typography';

import TokenBreakdown from '../TokenBreakdown/TokenBreakdown';
import { AiTokenCounts } from '../utils/genAi';

import styles from './EntityMetadataRow.module.scss';

interface TokenUsageTooltipProps {
	tokens: AiTokenCounts;
}

function TokenUsageTooltip({ tokens }: TokenUsageTooltipProps): JSX.Element {
	const { input, output, cacheRead, cacheWrite, reasoning } = tokens;

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
				input={input}
				output={output}
				cacheRead={cacheRead}
				cacheWrite={cacheWrite}
				reasoning={reasoning}
			/>
		</div>
	);
}

export default TokenUsageTooltip;
