import { Typography } from '@signozhq/ui/typography';

import TokenBreakdown from '../TokenBreakdown/TokenBreakdown';
import { AiTokenCounts } from '../utils/aiTraceUtils';

import styles from './EntityMetadataRow.module.scss';

interface TokenUsageTooltipProps {
	tokens: AiTokenCounts;
}

function TokenUsageTooltip({ tokens }: TokenUsageTooltipProps): JSX.Element {
	const { input, output, cacheRead, cacheWrite, reasoning } = tokens;

	return (
		<div className={styles.tokenTooltip}>
			<div className={styles.tokenTooltipTitle}>
				<Typography
					variant="paragraph"
					size="small"
					weight="regular"
					color="inherit"
					as="p"
					textOverflow="wrap"
				>
					Usage Breakdown
				</Typography>
			</div>
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
