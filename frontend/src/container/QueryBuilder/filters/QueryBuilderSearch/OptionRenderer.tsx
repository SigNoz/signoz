import './QueryBuilderSearch.styles.scss';

import { Tooltip } from 'antd';

import { TagContainer, TagLabel, TagValue } from './style';

function OptionRenderer({
	label,
	value,
	dataType,
	type,
}: OptionRendererProps): JSX.Element {
	return (
		<span className="option">
			{type ? (
				<Tooltip title={`${value}`} placement="topLeft">
					<div className="selectOptionContainer">
						<div className="option-value">{value}</div>
						<div className="option-meta-data-container">
							<TagContainer>
								<TagLabel>Type: </TagLabel>
								<TagValue>{type}</TagValue>
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
	dataType: string | undefined;
	type: string;
}

export default OptionRenderer;
