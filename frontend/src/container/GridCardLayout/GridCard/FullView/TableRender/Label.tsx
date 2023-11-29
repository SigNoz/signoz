import { useIsDarkMode } from 'hooks/useDarkMode';

import { LabelContainer } from '../styles';
import { LabelProps } from '../types';
import { getAbbreviatedLabel } from '../utils';

function Label({
	labelClickedHandler,
	labelIndex,
	label,
	disabled = false,
}: LabelProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const onClickHandler = (): void => {
		labelClickedHandler(labelIndex);
	};

	return (
		<LabelContainer
			isDarkMode={isDarkMode}
			type="button"
			disabled={disabled}
			onClick={onClickHandler}
		>
			{getAbbreviatedLabel(label)}
		</LabelContainer>
	);
}

export default Label;
