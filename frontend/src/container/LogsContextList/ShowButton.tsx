import './ShowButton.styles.scss';

import { Button } from 'antd';
import cx from 'classnames';
import { ORDERBY_FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface ShowButtonProps {
	isLoading: boolean;
	isDisabled: boolean;
	order: string;
	onClick: () => void;
}

function ShowButton({
	isLoading,
	isDisabled,
	order,
	onClick,
}: ShowButtonProps): JSX.Element {
	return (
		<Button
			disabled={isLoading || isDisabled}
			loading={isLoading}
			onClick={onClick}
			icon={
				order === ORDERBY_FILTERS.ASC ? (
					<ArrowUp size={14} />
				) : (
					<ArrowDown size={14} />
				)
			}
			className={cx(
				'show-more-button',
				order === ORDERBY_FILTERS.ASC ? 'up' : 'down',
			)}
		>
			Load more
		</Button>
	);
}

export default ShowButton;
