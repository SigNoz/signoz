import { Input, Typography } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ITraceTag } from 'types/api/trace/getTraceItem';

import { ModalText } from '..';
import { Container } from './styles';
import Tag from './Tag';

function Tags({ tags, onToggleHandler, setText }: TagsProps): JSX.Element {
	const { t } = useTranslation(['traceDetails']);
	const [allRenderedTags, setAllRenderedTags] = useState(tags);
	const isSearchVisible = useMemo(() => tags.length > 5, [tags]);

	useEffect(() => {
		setAllRenderedTags(tags);
	}, [tags]);

	const onChangeHandler = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>): void => {
			const { value } = e.target;
			const filteredTags = tags.filter((tag) => tag.key.includes(value));
			setAllRenderedTags(filteredTags);
		},
		[tags],
	);

	if (tags.length === 0) {
		return <Typography>No tags in selected span</Typography>;
	}

	return (
		<Container>
			{isSearchVisible && (
				<Input.Search
					placeholder={t('traceDetails:search_tags')}
					allowClear
					onChange={onChangeHandler}
				/>
			)}

			{allRenderedTags.map((tag) => (
				<Tag
					key={JSON.stringify(tag)}
					{...{
						onToggleHandler,
						setText,
						tags: tag,
					}}
				/>
			))}
		</Container>
	);
}

interface TagsProps extends CommonTagsProps {
	tags: ITraceTag[];
}

export interface CommonTagsProps {
	onToggleHandler: (state: boolean) => void;
	setText: React.Dispatch<React.SetStateAction<ModalText>>;
}

export default Tags;
