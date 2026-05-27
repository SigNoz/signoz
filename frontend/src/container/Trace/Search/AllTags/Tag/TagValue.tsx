import {
	Dispatch,
	memo,
	SetStateAction,
	useCallback,
	useMemo,
	useState,
} from 'react';
import { useQuery } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { ComboboxSimple, ComboboxSimpleItem } from '@signozhq/ui/combobox';
import getTagValue from 'api/trace/getTagValue';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';
import {
	disableTagValue,
	extractTagKey,
	extractTagType,
	getInitialLocalValue,
	getTagValueOptions,
	onTagValueChange,
	separateTagValues,
	TagValueTypes,
} from './utils';

function TagValue(props: TagValueProps): JSX.Element {
	const { tag, setLocalSelectedTags, index, tagKey } = props;
	const {
		Key: selectedKey,
		Operator: selectedOperator,
		StringValues: selectedStringValues,
		NumberValues: selectedNumberValues,
		BoolValues: selectedBoolValues,
	} = tag;

	const traces = useSelector<AppState, TraceReducer>((state) => state.traces);

	const [localTagValue, setLocalTagValue] = useState<TagValueTypes[]>(
		getInitialLocalValue(
			selectedNumberValues,
			selectedBoolValues,
			selectedStringValues,
		),
	);

	const globalReducer = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const tagType = useMemo(() => extractTagType(tagKey), [tagKey]);

	const { isLoading, data } = useQuery(
		[
			'tagKey',
			globalReducer.minTime,
			globalReducer.maxTime,
			tagKey,
			tagType,
			traces.spanKind,
		],
		{
			queryFn: () =>
				getTagValue({
					end: globalReducer.maxTime,
					start: globalReducer.minTime,
					tagKey: {
						Key: extractTagKey(tagKey),
						Type: tagType,
					},
					spanKind: traces.spanKind,
				}),
		},
	);

	const tagValueDisabled = useMemo(
		() =>
			disableTagValue(
				selectedOperator,
				setLocalTagValue,
				selectedKey,
				setLocalSelectedTags,
				index,
			),
		[index, selectedKey, selectedOperator, setLocalSelectedTags],
	);

	const onChangeHandler = useCallback(
		(value: unknown) => {
			const updatedValues = onTagValueChange(value);
			setLocalTagValue(updatedValues);
			const { boolValues, numberValues, stringValues } = separateTagValues(
				updatedValues,
				selectedKey,
			);

			setLocalSelectedTags((tags) => [
				...tags.slice(0, index),
				{
					...tags[index],
					BoolValues: boolValues,
					NumberValues: numberValues,
					StringValues: stringValues,
				},
				...tags.slice(index + 1),
			]);
		},
		[index, setLocalSelectedTags, selectedKey],
	);

	const items: ComboboxSimpleItem[] = useMemo(() => {
		const tagValueOptions = getTagValueOptions(data?.payload, tagType);
		if (!tagValueOptions) {
			return [];
		}
		return tagValueOptions.map((option) => ({
			value: String(option.value),
			label: String(option.label),
		}));
	}, [data?.payload, tagType]);

	// Note: ComboboxSimple does not support disabled prop natively
	// When disabled or loading, we render with pointer-events disabled
	const isDisabled = isLoading || tagValueDisabled;

	return (
		<ComboboxSimple
			multiple
			allowCreate
			value={localTagValue.map(String)}
			onChange={(v): void => onChangeHandler(v)}
			items={items}
			style={{
				width: '100%',
				...(isDisabled && { pointerEvents: 'none', opacity: 0.5 }),
			}}
		/>
	);
}

interface TagValueProps {
	index: number;
	tag: FlatArray<TraceReducer['selectedTags'], 1>;
	setLocalSelectedTags: Dispatch<SetStateAction<TraceReducer['selectedTags']>>;
	tagKey: string;
}

export default memo(TagValue);
