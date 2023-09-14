import { Tag } from 'antd';

import { SelectOptionContainer } from './style';
import { getOptionType } from './utils';

function OptionRenderer({
	label,
	value,
	dataType,
}: OptionRendererProps): JSX.Element {
	const optionType = getOptionType(label);

	return (
		<span>
			{optionType ? (
				<SelectOptionContainer>
					<div>{value}</div>
					<div>
						<Tag>Type: {optionType}</Tag>
						<Tag>Data type: {dataType}</Tag>
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
}

export default OptionRenderer;
