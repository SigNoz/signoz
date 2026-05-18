import { useState } from 'react';
import { Layout } from 'react-grid-layout';
import { Popover } from 'antd';
import useComponentPermission from 'hooks/useComponentPermission';
import { Ellipsis, PenLine, Plus, X } from '@signozhq/icons';
import { useAppContext } from 'providers/App/App';
import { usePanelTypeSelectionModalStore } from 'providers/Dashboard/helpers/panelTypeSelectionModalHelper';
import { setSelectedRowWidgetId } from 'providers/Dashboard/helpers/selectedRowWidgetIdHelper';
import {
	selectIsDashboardLocked,
	useDashboardStore,
} from 'providers/Dashboard/store/useDashboardStore';
import { ROLES, USER_ROLES } from 'types/roles';
import { ComponentTypes } from 'utils/permission';
import { Button } from '@signozhq/ui/button';

interface WidgetRowHeaderProps {
	rowWidgetProperties: {
		widgets: Layout[];
		collapsed: boolean;
	};
	editWidget: boolean;
	deleteWidget: boolean;
	setIsSettingsModalOpen: (value: React.SetStateAction<boolean>) => void;
	setCurrentSelectRowId: (value: React.SetStateAction<string | null>) => void;
	setIsDeleteModalOpen: (value: React.SetStateAction<boolean>) => void;
	id: string;
}

export function WidgetRowHeader(props: WidgetRowHeaderProps): JSX.Element {
	const {
		rowWidgetProperties,
		editWidget,
		deleteWidget,
		setCurrentSelectRowId,
		setIsDeleteModalOpen,
		setIsSettingsModalOpen,
		id,
	} = props;
	const [isRowSettingsOpen, setIsRowSettingsOpen] = useState<boolean>(false);

	const setIsPanelTypeSelectionModalOpen = usePanelTypeSelectionModalStore(
		(s) => s.setIsPanelTypeSelectionModalOpen,
	);

	const { dashboardData } = useDashboardStore();
	const isDashboardLocked = useDashboardStore(selectIsDashboardLocked);

	const permissions: ComponentTypes[] = ['add_panel'];
	const { user } = useAppContext();

	const userRole: ROLES | null =
		dashboardData?.createdBy === user?.email
			? (USER_ROLES.AUTHOR as ROLES)
			: user.role;
	const [addPanelPermission] = useComponentPermission(permissions, userRole);

	return (
		<Popover
			open={isRowSettingsOpen}
			arrow={false}
			onOpenChange={(visible): void => setIsRowSettingsOpen(visible)}
			rootClassName="row-settings"
			trigger="hover"
			placement="bottomRight"
			content={
				<div className="menu-content">
					<section className="section-1">
						<Button
							className="rename-btn"
							disabled={!editWidget}
							onClick={(): void => {
								setIsSettingsModalOpen(true);
								setCurrentSelectRowId(id);
								setIsRowSettingsOpen(false);
							}}
							variant="ghost"
							prefix={<PenLine size={14} />}
						>
							Rename
						</Button>
					</section>
					<section className="section-1">
						<Button
							className="new-panel-btn"
							disabled={!editWidget && addPanelPermission && !isDashboardLocked}
							onClick={(): void => {
								// TODO: @AshwinBhatkal Simplify this check in cleanup of https://github.com/SigNoz/engineering-pod/issues/3953
								if (!dashboardData?.id) {
									return;
								}

								setSelectedRowWidgetId(dashboardData.id, id);
								setIsPanelTypeSelectionModalOpen(true);
							}}
							variant="ghost"
							prefix={<Plus size={14} />}
						>
							New Panel
						</Button>
					</section>
					{!rowWidgetProperties.collapsed && (
						<section className="section-2">
							<Button
								className="remove-section"
								disabled={!deleteWidget}
								onClick={(): void => {
									setIsDeleteModalOpen(true);
									setCurrentSelectRowId(id);
									setIsRowSettingsOpen(false);
								}}
								variant="ghost"
								prefix={<X size={14} />}
							>
								Remove Section
							</Button>
						</section>
					)}
				</div>
			}
		>
			<Ellipsis
				size={14}
				className="settings-icon"
				onClick={(): void => setIsRowSettingsOpen(!isRowSettingsOpen)}
			/>
		</Popover>
	);
}
