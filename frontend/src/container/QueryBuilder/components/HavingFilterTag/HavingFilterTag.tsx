import { X } from '@signozhq/icons';

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
		<StyledTag color="vanilla">
			<span role="button" tabIndex={0} onClick={handleClick}>
				<StyledText>{value}</StyledText>
			</span>
			{closable && (
				<X
					size={12}
					style={{ cursor: 'pointer', marginInlineStart: 4 }}
					onClick={onClose}
				/>
			)}
		</StyledTag>
	);
}
