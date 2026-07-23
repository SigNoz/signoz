import { useMemo } from 'react';
import { useGetFieldKeys } from 'hooks/dynamicVariables/useGetFieldKeys';
import useResourceAttribute from 'hooks/useResourceAttribute';
import {
	convertRawQueriesToTraceSelectedTags,
	extractTracesResourceFieldKeyNames,
	filterSelectedTagsForTracesServices,
} from 'hooks/useResourceAttribute/utils';
import { Tags } from 'types/reducer/trace';

interface UseServicesListSelectedTagsResult {
	selectedTags: Tags[];
	isReady: boolean;
}

export function useServicesListSelectedTags(): UseServicesListSelectedTagsResult {
	const { queries } = useResourceAttribute();
	const { data: fieldKeysData, isLoading, isError } = useGetFieldKeys({
		signal: 'traces',
	});

	const tracesResourceKeys = useMemo(
		() => extractTracesResourceFieldKeyNames(fieldKeysData?.data),
		[fieldKeysData],
	);

	const selectedTags = useMemo(() => {
		const tags = (convertRawQueriesToTraceSelectedTags(queries) as Tags[]) || [];
		if (isLoading) {
			return tags;
		}
		if (isError) {
			return tags.filter((tag) => tag.TagType !== 'ResourceAttribute');
		}
		return filterSelectedTagsForTracesServices(tags, tracesResourceKeys);
	}, [queries, tracesResourceKeys, isLoading, isError]);

	return {
		selectedTags,
		isReady: !isLoading,
	};
}
