import './QuickFiltersSettings.styles.scss';

import { Button, Input } from 'antd';
import { CheckIcon, TableColumnsSplit, XIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Filter as FilterType } from 'types/api/quickFilters/getCustomFilters';

import { SignalType } from '../types';
import AddedFilters from './AddedFilters';
import useQuickFilterSettings from './hooks/useQuickFilterSettings';
import OtherFilters from './OtherFilters';

function QuickFiltersSettings({
	signal,
	setIsSettingsOpen,
	customFilters,
	refetchCustomFilters,
}: {
	signal: SignalType | undefined;
	setIsSettingsOpen: (isSettingsOpen: boolean) => void;
	customFilters: FilterType[];
	refetchCustomFilters: () => void;
}): JSX.Element {
	const {
		handleSettingsClose,
		handleDiscardChanges,
		addedFilters,
		setAddedFilters,
		handleSaveChanges,
		isUpdatingCustomFilters,
		inputValue,
		handleInputChange,
		debouncedInputValue,
	} = useQuickFilterSettings({
		setIsSettingsOpen,
		customFilters,
		refetchCustomFilters,
		signal,
	});

	const hasUnsavedChanges = useMemo(
		() =>
			// check if both arrays have the same length and same order of elements
			!(
				addedFilters.length === customFilters.length &&
				addedFilters.every(
					(filter, index) => filter.key === customFilters[index].key,
				)
			),
		[addedFilters, customFilters],
	);

	return (
		<>
			<div className="qf-header">
				<div className="qf-title">
					<TableColumnsSplit width={16} height={16} />
					Edit quick filters
				</div>
				<XIcon
					className="qf-header-icon"
					width={16}
					height={16}
					onClick={handleSettingsClose}
				/>
			</div>
			<section className="search">
				<Input
					type="text"
					value={inputValue}
					placeholder="Search for a filter..."
					onChange={handleInputChange}
				/>
			</section>
			<AddedFilters
				inputValue={inputValue}
				addedFilters={addedFilters}
				setAddedFilters={setAddedFilters}
			/>
			<OtherFilters
				signal={signal}
				inputValue={debouncedInputValue}
				addedFilters={addedFilters}
				setAddedFilters={setAddedFilters}
			/>
			{hasUnsavedChanges && (
				<div className="qf-footer">
					<Button
						type="default"
						onClick={handleDiscardChanges}
						icon={<XIcon width={16} height={16} />}
					>
						Discard
					</Button>
					<Button
						type="primary"
						onClick={handleSaveChanges}
						icon={<CheckIcon width={16} height={16} />}
						loading={isUpdatingCustomFilters}
					>
						Save changes
					</Button>
				</div>
			)}
		</>
	);
}

export default QuickFiltersSettings;
