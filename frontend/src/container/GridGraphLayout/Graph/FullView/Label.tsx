import { LabelContainer } from './styles';
import { getAbbreviatedLabel } from './utils';

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

interface LabelProps {
	labelClickedHandler: (labelIndex: number) => void;
	labelIndex: number;
	label: string;
}

export default Label;
