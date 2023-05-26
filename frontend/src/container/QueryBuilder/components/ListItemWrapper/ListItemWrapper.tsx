// ** Types
import { ListItemWrapperProps } from './ListItemWrapper.interfaces';
// ** Styles
import { StyledDeleteEntity, StyledRow } from './ListItemWrapper.styled';

export function ListItemWrapper({
	children,
	onDelete,
}: ListItemWrapperProps): JSX.Element {
	return (
		<StyledRow gutter={[0, 15]}>
			<StyledDeleteEntity onClick={onDelete} />
			{children}
		</StyledRow>
	);
}
