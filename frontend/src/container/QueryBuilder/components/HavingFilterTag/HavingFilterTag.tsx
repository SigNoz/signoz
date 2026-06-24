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
		<StyledTag
			color="vanilla"
			closable={closable}
			onClose={(e): void => {
				e.preventDefault();
				onClose();
			}}
		>
			<span role="button" tabIndex={0} onClick={handleClick}>
				<StyledText>{value}</StyledText>
			</span>
		</StyledTag>
	);
}
