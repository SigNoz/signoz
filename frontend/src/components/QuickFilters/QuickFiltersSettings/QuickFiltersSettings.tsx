import { Button as SignozButton } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Button } from 'antd';
import { Check, TableColumnsSplit, X } from '@signozhq/icons';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import { SignalType } from '../types';
import AddedFilters from './AddedFilters';
import useQuickFilterSettings from './hooks/useQuickFilterSettings';
import OtherFilters from './OtherFilters';

import './QuickFiltersSettings.styles.scss';

function QuickFiltersSettings({
	signal,
	setIsSettingsOpen,
	customFilters,
	refetchCustomFilters,
}: {
	signal: SignalType | undefined;
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
		signal,
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
					size="icon"
					aria-label="Close"
					prefix={<X size={14} />}
					onClick={handleSettingsClose}
					data-testid="quick-filters-settings-close"
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
