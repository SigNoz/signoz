import { Button, Typography } from 'antd';
import { FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';

import { ShowButtonWrapper } from './styles';

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
		<ShowButtonWrapper>
			<Typography>
				Showing 10 lines {order === FILTERS.ASC ? 'after' : 'before'} match
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
