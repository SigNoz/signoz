import { HavingFilterTagProps } from './HavingFilterTag.interfaces';
import { StyledTag, StyledText } from './HavingFilterTag.styled';

export function HavingFilterTag({
	value,
	closable,
	onClose,
	onUpdate,
}: HavingFilterTagProps): JSX.Element {
	const handleClick = (): void => {
		onUpdate(value);
	};

	return (
		<StyledTag closable={closable} onClose={onClose}>
			<span role="button" tabIndex={0} onClick={handleClick}>
				<StyledText>{value}</StyledText>
			</span>
		</StyledTag>
	);
}
