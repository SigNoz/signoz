import StripSeparator from 'container/BottomStrip/components/StripSeparator/StripSeparator';
import StripTypography from 'container/BottomStrip/components/StripTypography/StripTypography';
import cx from 'classnames';
import { ChartNoAxesGantt, TriangleAlert } from '@signozhq/icons';

import styles from './StripInfo.module.scss';

interface StripInfoProps {
	totalSpansCount: number;
	totalErrorSpansCount: number;
}

function StripInfo({
	totalSpansCount,
	totalErrorSpansCount,
}: StripInfoProps): JSX.Element {
	return (
		<>
			<StripTypography prefix={<ChartNoAxesGantt size={13} />}>
				Spans: {totalSpansCount}
			</StripTypography>
			<StripSeparator />
			<StripTypography
				prefix={
					<TriangleAlert
						size={13}
						className={cx({ [styles.hasErrors]: totalErrorSpansCount > 0 })}
					/>
				}
			>
				Errors: {totalErrorSpansCount}
			</StripTypography>
		</>
	);
}

export default StripInfo;
