import './QuickFiltersSettings.styles.scss';

import { TableColumnsSplit, X } from 'lucide-react';

import AddedFilters from './AddedFilters';
import useQuickFilterSettings from './hooks/useQuickFilterSettings';
import OtherFilters from './OtherFilters';

function QuickFiltersSettings({
	setIsSettingsOpen,
}: {
	setIsSettingsOpen: (isSettingsOpen: boolean) => void;
}): JSX.Element {
	const {
		customFilters,
		setCustomFilters,
		handleSettingsClose,
	} = useQuickFilterSettings({ setIsSettingsOpen });
	return (
		<div className="quick-filters-settings">
			<div className="qf-header">
				<div className="qf-title">
					<TableColumnsSplit width={16} height={16} />
					Edit quick filters
				</div>
				<X
					className="qf-header-icon"
					width={16}
					height={16}
					onClick={handleSettingsClose}
				/>
			</div>
			<AddedFilters filters={customFilters} setFilters={setCustomFilters} />
			<OtherFilters />
		</div>
	);
}

export default QuickFiltersSettings;
