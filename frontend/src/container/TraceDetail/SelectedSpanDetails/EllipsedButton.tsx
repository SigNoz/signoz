import { StyledButton } from 'components/Styled';

import { styles } from './styles';

function EllipsedButton({
	onToggleHandler,
	setText,
	value,
	event,
	buttonText,
}: Props): JSX.Element {
	const isFullValueButton = buttonText === 'View full value';

	const style = [styles.removePadding];

	if (!isFullValueButton) {
		style.push(styles.removeMargin);
	} else {
		style.push(styles.selectedSpanDetailsContainer);
		style.push(styles.buttonContainer);
	}

	return (
		<StyledButton
			styledclass={style}
			onClick={(): void => {
				onToggleHandler(true);
				setText({
					subText: value,
					text: event,
				});
			}}
			type="link"
		>
			{buttonText}
		</StyledButton>
	);
}

interface Props {
	onToggleHandler: (isOpen: boolean) => void;
	setText: (text: { subText: string; text: string }) => void;
	value: string;
	event: string;
	buttonText?: string;
}

EllipsedButton.defaultProps = {
	buttonText: 'View full log event message',
};

export default EllipsedButton;
