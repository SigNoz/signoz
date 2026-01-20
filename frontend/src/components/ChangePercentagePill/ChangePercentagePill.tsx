import './ChangePercentagePill.styles.scss';

import { Color } from '@signozhq/design-tokens';
import cx from 'classnames';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface ChangePercentagePillProps {
	percentage: number;
	direction: number;
}
function ChangePercentagePill({
	percentage,
	direction,
}: ChangePercentagePillProps): JSX.Element | null {
	if (direction === 0 || percentage === 0) {
		return null;
	}
	const isPositive = direction > 0;
	return (
		<div
			className={cx('change-percentage-pill', {
				'change-percentage-pill--positive': isPositive,
				'change-percentage-pill--negative': !isPositive,
			})}
		>
			<div className="change-percentage-pill__icon">
				{isPositive ? (
					<ArrowUp size={12} color={Color.BG_FOREST_500} />
				) : (
					<ArrowDown size={12} color={Color.BG_CHERRY_500} />
				)}
			</div>
			<div className="change-percentage-pill__label">{percentage}%</div>
		</div>
	);
}

export default ChangePercentagePill;
