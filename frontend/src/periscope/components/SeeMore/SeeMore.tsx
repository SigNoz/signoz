import './seeMore.styles.scss';

import { useState } from 'react';

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
	const [showAll, setShowAll] = useState(false);

	const handleToggle = (): void => {
		setShowAll(!showAll);
	};

	const itemsToShow = showAll ? children : children.slice(0, initialCount);
	const remainingCount = children.length - initialCount;

	return (
		<>
			{itemsToShow}
			{!showAll && remainingCount > 0 && (
				<button
					type="button"
					className="see-more-button"
					onClick={handleToggle}
				>{`+${remainingCount} ${moreLabel}`}</button>
			)}
		</>
	);
}

export default SeeMore;
