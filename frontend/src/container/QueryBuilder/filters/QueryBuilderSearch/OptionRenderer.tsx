import './QueryBuilderSearch.styles.scss';

import { Tooltip } from 'antd';

import { TagContainer, TagLabel, TagValue } from './style';
import { getOptionType, getRemovePrefixFromKey } from './utils';

function OptionRenderer({
	label,
	value,
	dataType,
}: OptionRendererProps): JSX.Element {
	const optionType = getOptionType(label);

	return (
		<span className="option">
			{optionType ? (
				<Tooltip title={`${getRemovePrefixFromKey(value)}`} placement="topLeft">
					<div className="selectOptionContainer">
						<div className="option-value">{getRemovePrefixFromKey(value)}</div>
						<div className="option-meta-data-container">
							<TagContainer>
								<TagLabel>Type: </TagLabel>
								<TagValue>{optionType}</TagValue>
							</TagContainer>
							<TagContainer>
								<TagLabel>Data type: </TagLabel>
								<TagValue>{dataType}</TagValue>
							</TagContainer>
						</div>
					</div>
				</Tooltip>
			) : (
				<Tooltip title={label} placement="topLeft">
					<span>{label}</span>
				</Tooltip>
			)}
		</span>
	);
}

interface OptionRendererProps {
	label: string;
	value: string;
	dataType: string;
}

export default OptionRenderer;
