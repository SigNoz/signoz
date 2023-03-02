import { Input, List, Typography } from 'antd';
import Link from 'antd/es/typography/Link';
import ROUTES from 'constants/routes';
import { formUrlParams } from 'container/TraceDetail/utils';
import React, {
	ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { ITraceTag } from 'types/api/trace/getTraceItem';

import { ModalText } from '..';
import { Container } from './styles';
import Tag from './Tag';

function Tags({
	tags,
	linkedSpans,
	onToggleHandler,
	setText,
}: TagsProps): JSX.Element {
	const { t } = useTranslation(['traceDetails']);
	const [allRenderedTags, setAllRenderedTags] = useState(tags);
	const isSearchVisible = useMemo(() => tags.length > 5, [tags]);

	useEffect(() => {
		setAllRenderedTags(tags);
	}, [tags]);
	const getLink = (item: Record<string, string>): string =>
		`${ROUTES.TRACE}/${item.TraceId}${formUrlParams({
			spanId: item.SpanId,
			levelUp: 0,
			levelDown: 0,
		})}`;
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
			{linkedSpans && linkedSpans.length > 0 && (
				<List
					header={<Typography.Title level={5}>Linked Spans</Typography.Title>}
					dataSource={linkedSpans}
					renderItem={(item): ReactNode => (
						<List.Item>
							<Link href={getLink(item)} target="_blank">
								{item.SpanId}
							</Link>
						</List.Item>
					)}
				/>
			)}
		</Container>
	);
}

interface TagsProps extends CommonTagsProps {
	tags: ITraceTag[];
	linkedSpans: Record<string, string>[] | undefined;
}

export interface CommonTagsProps {
	onToggleHandler: (state: boolean) => void;
	setText: React.Dispatch<React.SetStateAction<ModalText>>;
}

export default Tags;
