import { useEffect, useState } from 'react';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Tabs } from '@signozhq/ui/tabs';
import logEvent from 'api/common/logEvent';
import { DashboardListEvents } from 'pages/DashboardsListPageV2/constants/events';

import BlankDashboardPanel from './BlankDashboardPanel';
import ImportJsonPanel from './ImportJsonPanel';
import TemplatesPanel from './TemplatesPanel';

interface Props {
	open: boolean;
	onClose: () => void;
}

function NewDashboardModal({ open, onClose }: Props): JSX.Element {
	const [tab, setTab] = useState('blank');

	useEffect(() => {
		if (open) {
			setTab('blank');
		}
	}, [open]);

	const handleTabChange = (key: string): void => {
		setTab(key);
		void logEvent(DashboardListEvents.CreateModalTabChanged, { tab: key });
	};

	return (
		<DialogWrapper
			title="New dashboard"
			open={open}
			width="wide"
			onOpenChange={(next): void => {
				if (!next) {
					onClose();
				}
			}}
		>
			<Tabs
				value={tab}
				onChange={handleTabChange}
				items={[
					{
						key: 'blank',
						label: 'Blank',
						children: <BlankDashboardPanel onClose={onClose} />,
					},
					{
						key: 'template',
						label: 'From a template',
						children: <TemplatesPanel />,
					},
					{
						key: 'import',
						label: 'Import JSON',
						children: <ImportJsonPanel onClose={onClose} />,
					},
				]}
			/>
		</DialogWrapper>
	);
}

export default NewDashboardModal;
