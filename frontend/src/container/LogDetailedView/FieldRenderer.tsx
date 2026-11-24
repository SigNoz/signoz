import { Divider } from '@signozhq/ui/divider';
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
					<Typography
						variant="code"
						size="base"
						weight="regular"
						color="primary"
						as="p"
						textOverflow="ellipsis"
					>
						{newField}{' '}
					</Typography>

					<div className="tags">
						<TagContainer>
							<TagLabel>
								type
								<Divider orientation="vertical" />{' '}
							</TagLabel>
							<TagValue>{logType}</TagValue>
						</TagContainer>
						<TagContainer>
							<TagLabel>
								data type <Divider orientation="vertical" />{' '}
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
