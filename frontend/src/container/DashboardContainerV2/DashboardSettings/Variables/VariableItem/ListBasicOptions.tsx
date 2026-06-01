import type { V2VariableKind } from '../types';
import AllOptionRow from './ListOptions/AllOptionRow';
import CapturingRegexpRow from './ListOptions/CapturingRegexpRow';
import CustomAllValueRow from './ListOptions/CustomAllValueRow';
import DefaultValueRow from './ListOptions/DefaultValueRow';
import MultiSelectRow from './ListOptions/MultiSelectRow';
import SortRow from './ListOptions/SortRow';

interface Props {
	kind: V2VariableKind;
	allowAllValue: boolean;
	allowMultiple: boolean;
	sort: string;
	defaultValue: string;
	customAllValue: string;
	capturingRegexp: string;
	previewValues: string[];
	onAllowAllChange: (v: boolean) => void;
	onAllowMultipleChange: (v: boolean) => void;
	onSortChange: (v: string) => void;
	onDefaultValueChange: (v: string) => void;
	onCustomAllValueChange: (v: string) => void;
	onCapturingRegexpChange: (v: string) => void;
}

function ListBasicOptions({
	kind,
	allowAllValue,
	allowMultiple,
	sort,
	defaultValue,
	customAllValue,
	capturingRegexp,
	previewValues,
	onAllowAllChange,
	onAllowMultipleChange,
	onSortChange,
	onDefaultValueChange,
	onCustomAllValueChange,
	onCapturingRegexpChange,
}: Props): JSX.Element {
	return (
		<>
			<SortRow sort={sort} onChange={onSortChange} />
			<MultiSelectRow
				allowMultiple={allowMultiple}
				onChange={(v): void => {
					onAllowMultipleChange(v);
					if (!v) {onAllowAllChange(false);}
				}}
			/>
			{allowMultiple && kind !== 'DYNAMIC' ? (
				<AllOptionRow
					allowAllValue={allowAllValue}
					onChange={onAllowAllChange}
				/>
			) : null}
			{allowAllValue ? (
				<CustomAllValueRow
					customAllValue={customAllValue}
					onChange={onCustomAllValueChange}
				/>
			) : null}
			{kind === 'QUERY' || kind === 'DYNAMIC' ? (
				<CapturingRegexpRow
					capturingRegexp={capturingRegexp}
					onChange={onCapturingRegexpChange}
				/>
			) : null}
			<DefaultValueRow
				kind={kind}
				defaultValue={defaultValue}
				previewValues={previewValues}
				onChange={onDefaultValueChange}
			/>
		</>
	);
}

export default ListBasicOptions;
