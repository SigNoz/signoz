import { Tag, Tooltip } from 'antd';
import { useAutoComplete } from 'hooks/queryBuilder/useAutoComplete';
import React from 'react';
import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';

import { CustomTagProps } from '.';
import { TypographyText } from './style';
import { isInNotInOperator } from './utils';

function TagRender({
	value,
	closable,
	onClose,
	query,
}: TagRenderProps): React.ReactElement {
	const { updateTag, handleSearch } = useAutoComplete(query);

	const isInNin = isInNotInOperator(value);

	const onCloseHandler = (): void => {
		onClose();
		handleSearch('');
	};

	const tagEditHandler = (value: string): void => {
		updateTag(value);
		handleSearch(value);
	};

	return (
		<Tag closable={closable} onClose={onCloseHandler}>
			<Tooltip title={value}>
				<TypographyText
					ellipsis
					$isInNin={isInNin}
					onClick={(): void => tagEditHandler(value)}
				>
					{value}
				</TypographyText>
			</Tooltip>
		</Tag>
	);
}

interface TagRenderProps extends CustomTagProps {
	query: IBuilderQueryForm;
}

export default TagRender;
