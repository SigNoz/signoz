import { useMemo } from 'react';
// eslint-disable-next-line signoz/no-antd-components
import type { SelectProps } from 'antd';
import { Select } from 'antd';
import type { ExportDashboard } from 'hooks/dashboard/useExportDashboards';

import { getSelectOptions } from './utils';
import styles from './ExportPanel.module.scss';

interface ExportDashboardSelectProps {
	dashboards: ExportDashboard[];
	value: string | null;
	/** The picked dashboard, pinned as an option so its label survives a later search. */
	selectedDashboard: ExportDashboard | null;
	loading?: boolean;
	disabled?: boolean;
	onChange: (dashboardId: string) => void;
	onSearch: (search: string) => void;
}

/**
 * Dashboard picker for the "Add to dashboard" dialog. Server-side search (`filterOption`
 * off, typing via `onSearch`); the selected dashboard is pinned as an option so its label
 * survives a narrowing search. The dropdown renders in the dialog panel: outside it a click
 * would close the dialog, and inside its scrolling body it is clipped and pushed over the field.
 */
function ExportDashboardSelect({
	dashboards,
	value,
	selectedDashboard,
	loading,
	disabled,
	onChange,
	onSearch,
}: ExportDashboardSelectProps): JSX.Element {
	const options = useMemo<SelectProps['options']>(() => {
		const base = getSelectOptions(dashboards) ?? [];
		if (
			selectedDashboard &&
			!base.some((option) => option.value === selectedDashboard.id)
		) {
			return [
				{ label: selectedDashboard.title, value: selectedDashboard.id },
				...base,
			];
		}
		return base;
	}, [dashboards, selectedDashboard]);

	return (
		<Select
			className={styles.dashboardSelect}
			placeholder="Select a dashboard"
			showSearch
			filterOption={false}
			loading={loading}
			disabled={disabled}
			value={value}
			onChange={onChange}
			onSearch={onSearch}
			data-testid="export-dashboard-select"
			options={options}
			getPopupContainer={(trigger: HTMLElement): HTMLElement =>
				trigger.closest<HTMLElement>('[role="dialog"]') ?? document.body
			}
		/>
	);
}

ExportDashboardSelect.defaultProps = {
	loading: false,
	disabled: false,
};

export default ExportDashboardSelect;
