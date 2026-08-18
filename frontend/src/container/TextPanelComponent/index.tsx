import './TextPanelComponent.styles.scss';

interface TextPanelComponentProps {
	textContent?: string;
}

function TextPanelComponent({
	textContent = '',
}: TextPanelComponentProps): JSX.Element {
	return (
		<div className="text-panel-container">
			<div className="text-panel-content">{textContent}</div>
		</div>
	);
}

export default TextPanelComponent;
