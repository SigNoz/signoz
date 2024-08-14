import './seeMore.styles.scss';

import { Popover } from 'antd';

type SeeMoreProps = {
	children: JSX.Element[];
	initialCount: number;
	moreLabel: string;
};

function SeeMore({
	children,
	initialCount,
	moreLabel,
}: SeeMoreProps): JSX.Element {
	const remainingCount = children.length - initialCount;

	return (
		<>
			{children.slice(0, initialCount)}
			{remainingCount > 0 && (
				<Popover
					color="var(--bg-ink-400)"
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

export default SeeMore;
