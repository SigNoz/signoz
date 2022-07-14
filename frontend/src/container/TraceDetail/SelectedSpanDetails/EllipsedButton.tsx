import { StyledButton } from 'components/Styled';
import React from 'react';

import { styles } from './styles';

function EllipsedButton({
	onToggleHandler,
	setText,
	value,
	event,
}: Props): JSX.Element {
	return (
		<StyledButton
			styledclass={[styles.removeMargin, styles.removePadding]}
			onClick={(): void => {
				onToggleHandler(true);
				setText({
					subText: value,
					text: event,
				});
			}}
			type="link"
		>
			View full log event message
		</StyledButton>
	);
}

interface Props {
	onToggleHandler: (isOpen: boolean) => void;
	setText: (text: { subText: string; text: string }) => void;
	value: string;
	event: string;
}

export default EllipsedButton;
