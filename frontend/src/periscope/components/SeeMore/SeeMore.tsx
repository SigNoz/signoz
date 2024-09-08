import './SeeMore.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Popover } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';

type SeeMoreProps = {
	children: JSX.Element[];
	initialCount?: number;
	moreLabel: string;
};

function SeeMore({
	children,
	initialCount = 2,
	moreLabel,
}: SeeMoreProps): JSX.Element {
	const remainingCount = children.length - initialCount;
	const isDarkMode = useIsDarkMode();

	return (
		<>
			{children.slice(0, initialCount)}
			{remainingCount > 0 && (
				<Popover
					color={isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100}
					destroyTooltipOnHide
					content={
						<div className="see-more-popover-content">
							{children.slice(initialCount)}
						</div>
					}
				>
					<button
						type="button"
						className="see-more-button"
					>{`+${remainingCount} ${moreLabel}`}</button>
				</Popover>
			)}
		</>
	);
}

SeeMore.defaultProps = {
	initialCount: 2,
};

export default SeeMore;
