import './styles.scss';

import { Button, Typography } from 'antd';
import { Check, Send, X } from 'lucide-react';

import { useCreateAlertState } from '../context';

function Footer(): JSX.Element {
	const { discardAlertRule } = useCreateAlertState();

	const handleDiscard = (): void => discardAlertRule();

	const handleTestNotification = (): void => {
		console.log('test notification');
	};

	const handleSaveAlert = (): void => {
		console.log('save alert');
	};

	return (
		<div className="create-alert-v2-footer">
			<Button type="text" onClick={handleDiscard}>
				<X size={14} /> Discard
			</Button>
			<div className="button-group">
				<Button type="default" onClick={handleTestNotification}>
					<Send size={14} />
					<Typography.Text>Test Notification</Typography.Text>
				</Button>
				<Button type="primary" onClick={handleSaveAlert}>
					<Check size={14} />
					<Typography.Text>Save Alert Rule</Typography.Text>
				</Button>
			</div>
		</div>
	);
}

export default Footer;
