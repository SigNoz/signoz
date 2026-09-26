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
		<StyledTag
			suffix={
				closable ? (
					<button
						type="button"
						aria-label="Remove"
						onClick={(e): void => {
							e.preventDefault();
							onClose();
						}}
					>
						<X size={12} />
					</button>
				) : undefined
			}
		>
			<span role="button" tabIndex={0} onClick={handleClick}>
				<StyledText>{value}</StyledText>
			</span>
		</StyledTag>
	);
}
