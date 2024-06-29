import { Button, Popover } from 'antd';
import { EllipsisIcon, PenLine, X } from 'lucide-react';
import { useState } from 'react';
import { Layout } from 'react-grid-layout';

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
