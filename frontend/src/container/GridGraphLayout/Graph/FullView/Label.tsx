import { LabelContainer } from './styles';
import { getAbbreviatedLabel } from './utils';

function Label({
	labelClickedHandler,
	labelIndex,
	label,
}: LabelProps): JSX.Element {
	return (
		<LabelContainer
			type="button"
			onClick={(): void => labelClickedHandler(labelIndex)}
		>
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
