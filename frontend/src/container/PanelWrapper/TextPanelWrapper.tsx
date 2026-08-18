import TextPanelComponent from 'container/TextPanelComponent';
import { Widgets } from 'types/api/dashboard/getAll';

interface TextPanelWrapperProps {
	widget: Widgets;
}

function TextPanelWrapper({ widget }: TextPanelWrapperProps): JSX.Element {
	return <TextPanelComponent textContent={widget.textContent} />;
}

export default TextPanelWrapper;
