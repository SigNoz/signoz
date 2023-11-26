import { Button, Typography } from 'antd';
import { ORDERBY_FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';

import { ShowButtonWrapper } from './styles';

interface ShowButtonProps {
	isLoading: boolean;
	isDisabled: boolean;
	order: string;
	lines: number;
	onClick: () => void;
}

function ShowButton({
	isLoading,
	isDisabled,
	order,
	lines,
	onClick,
}: ShowButtonProps): JSX.Element {
	return (
		<ShowButtonWrapper>
			<Typography>
				Showing {lines} lines {order === ORDERBY_FILTERS.ASC ? 'after' : 'before'}{' '}
				match
			</Typography>
			<Button
				size="small"
				disabled={isLoading || isDisabled}
				loading={isLoading}
				onClick={onClick}
			>
				Show 10 more lines
			</Button>
		</ShowButtonWrapper>
	);
}

export default ShowButton;
