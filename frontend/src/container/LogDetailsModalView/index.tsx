import { Modal } from 'antd';
import InputComponent from 'components/Input';
import { useState } from 'react';

// components
import CloseWrapperIcon from './components/CloseWrapperIcon';
import CurrentLog from './components/CurrentLog';
import HistoryLogs from './components/HistoryLogs';
// types
import { HistoryPosition } from './interfaces/IHistoryLogs';

function LogDetailsModalView(): JSX.Element {
	const [filterInputVisible, setFilterInputVisible] = useState<boolean>(false);
	return (
		<Modal
			title="Log Details"
			closable
			open={false}
			footer={null}
			closeIcon={
				<CloseWrapperIcon
					toggleInput={(): void => setFilterInputVisible(!filterInputVisible)}
				/>
			}
			destroyOnClose
		>
			{filterInputVisible && <InputComponent value="" />}
			<HistoryLogs position={HistoryPosition.prev} fetchLogs={(): void => {}} />
			<CurrentLog log="log" />
			<HistoryLogs position={HistoryPosition.next} fetchLogs={(): void => {}} />
		</Modal>
	);
}

export default LogDetailsModalView;
