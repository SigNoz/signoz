import { Divider } from '@signozhq/ui/divider';
import { Tooltip } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';

import { TagContainer, TagLabel, TagValue } from './FieldRenderer.styles';
import { FieldRendererProps } from './LogDetailedView.types';
import { getFieldAttributes } from './utils';

import './FieldRenderer.styles.scss';

function FieldRenderer({ field }: FieldRendererProps): JSX.Element {
	const { dataType, newField, logType } = getFieldAttributes(field);

	return (
		<span className="field-renderer-container">
			{dataType && newField && logType ? (
				<>
					<Tooltip title={newField} side="left">
						<Typography.Text truncate={1} className="label">
							{newField}{' '}
						</Typography.Text>
					</Tooltip>

					<div className="tags">
						<TagContainer>
							<TagLabel>
								type
								<Divider type="vertical" />{' '}
							</TagLabel>
							<TagValue>{logType}</TagValue>
						</TagContainer>
						<TagContainer>
							<TagLabel>
								data type <Divider type="vertical" />{' '}
							</TagLabel>
							<TagValue>{dataType}</TagValue>
						</TagContainer>
					</div>
				</>
			) : (
				<span className="label">{field}</span>
			)}
		</span>
	);
}

export default FieldRenderer;
