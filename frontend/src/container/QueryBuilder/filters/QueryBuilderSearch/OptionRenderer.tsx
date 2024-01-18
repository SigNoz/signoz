import {
	SelectOptionContainer,
	TagContainer,
	TagLabel,
	TagValue,
} from './style';
import { getOptionType } from './utils';

function OptionRenderer({
	label,
	value,
	dataType,
	isColumn,
}: OptionRendererProps): JSX.Element {
	const optionType = getOptionType(label);

	return (
		<span className="option">
			{optionType ? (
				<SelectOptionContainer>
					<div className="option-value">{value}</div>
					<div className="option-meta-data-container">
						<TagContainer>
							<TagLabel>Type: </TagLabel>
							<TagValue>{optionType}</TagValue>
						</TagContainer>
						<TagContainer>
							<TagLabel>Data type: </TagLabel>
							<TagValue>{dataType}</TagValue>
						</TagContainer>
						<TagContainer>
							<TagLabel>isColumn: </TagLabel>
							<TagValue>{isColumn ? 'True' : 'False'}</TagValue>
						</TagContainer>
					</div>
				</SelectOptionContainer>
			) : (
				<span>{label}</span>
			)}
		</span>
	);
}

interface OptionRendererProps {
	label: string;
	value: string;
	dataType: string;
	isColumn: boolean;
}

export default OptionRenderer;
