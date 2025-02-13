import { Button, Popover } from 'antd';
import useComponentPermission from 'hooks/useComponentPermission';
import { EllipsisIcon, PenLine, Plus, X } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useState } from 'react';
import { Layout } from 'react-grid-layout';
import { ROLES, USER_ROLES } from 'types/roles';
import { ComponentTypes } from 'utils/permission';

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

	const {
		handleToggleDashboardSlider,
		selectedDashboard,
		isDashboardLocked,
		setSelectedRowWidgetId,
	} = useDashboard();

	const permissions: ComponentTypes[] = ['add_panel'];
	const { user } = useAppContext();

	const userRole: ROLES | null =
		selectedDashboard?.created_by === user?.email
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
							type="text"
							disabled={!editWidget}
							icon={<PenLine size={14} />}
							onClick={(): void => {
								setIsSettingsModalOpen(true);
								setCurrentSelectRowId(id);
								setIsRowSettingsOpen(false);
							}}
						>
							Rename
						</Button>
					</section>
					<section className="section-1">
						<Button
							className="new-panel-btn"
							type="text"
							disabled={!editWidget && addPanelPermission && !isDashboardLocked}
							icon={<Plus size={14} />}
							onClick={(): void => {
								setSelectedRowWidgetId(id);
								handleToggleDashboardSlider(true);
							}}
						>
							New Panel
						</Button>
					</section>
					{!rowWidgetProperties.collapsed && (
						<section className="section-2">
							<Button
								className="remove-section"
								type="text"
								icon={<X size={14} />}
								disabled={!deleteWidget}
								onClick={(): void => {
									setIsDeleteModalOpen(true);
									setCurrentSelectRowId(id);
									setIsRowSettingsOpen(false);
								}}
							>
								Remove Section
							</Button>
						</section>
					)}
				</div>
			}
		>
			<EllipsisIcon
				size={14}
				className="settings-icon"
				onClick={(): void => setIsRowSettingsOpen(!isRowSettingsOpen)}
			/>
		</Popover>
	);
}
