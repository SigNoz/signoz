import { Button as SignozButton } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Button } from 'antd';
import { Check, TableColumnsSplit, X } from '@signozhq/icons';
import { QuickfiltertypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import AddedFilters from './AddedFilters';
import useQuickFilterSettings from './hooks/useQuickFilterSettings';
import OtherFilters from './OtherFilters';

import './QuickFiltersSettings.styles.scss';

function QuickFiltersSettings({
	savedFiltersSource,
	setIsSettingsOpen,
	customFilters,
	refetchCustomFilters,
}: {
	savedFiltersSource: QuickfiltertypesSourceDTO;
	setIsSettingsOpen: (isSettingsOpen: boolean) => void;
	customFilters: TelemetryFieldKey[];
	refetchCustomFilters: () => void;
}): JSX.Element {
	const {
		handleSettingsClose,
		handleDiscardChanges,
		addedFilters,
		setAddedFilters,
		handleSaveChanges,
		hasUnsavedChanges,
		isUpdatingCustomFilters,
		inputValue,
		handleInputChange,
		debouncedInputValue,
	} = useQuickFilterSettings({
		setIsSettingsOpen,
		customFilters,
		refetchCustomFilters,
		savedFiltersSource,
	});

	return (
		<>
			<div className="qf-header">
				<div className="qf-title">
					<TableColumnsSplit size={16} />
					Edit quick filters
				</div>
				<SignozButton
					variant="ghost"
					color="secondary"
					size="sm"
					icon
					aria-label="Close"
					onClick={handleSettingsClose}
					testId="quick-filters-settings-close"
				>
					<X size={14} />
				</SignozButton>
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
				savedFiltersSource={savedFiltersSource}
				inputValue={debouncedInputValue}
				addedFilters={addedFilters}
				setAddedFilters={setAddedFilters}
			/>
			{hasUnsavedChanges && (
				<div className="qf-footer">
					<Button
						type="default"
						onClick={handleDiscardChanges}
						icon={<X size={16} />}
					>
						Discard
					</Button>
					<Button
						type="primary"
						onClick={handleSaveChanges}
						icon={<Check size={16} />}
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
