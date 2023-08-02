import { LabelContainer } from '../styles';
import { LabelProps } from '../types';
import { getAbbreviatedLabel } from '../utils';

function Label({
	labelClickedHandler,
	labelIndex,
	label,
}: LabelProps): JSX.Element {
	const onClickHandler = (): void => {
		labelClickedHandler(labelIndex);
	};

	return (
		<LabelContainer type="button" onClick={onClickHandler}>
			{getAbbreviatedLabel(label)}
		</LabelContainer>
	);
}

export default Label;
