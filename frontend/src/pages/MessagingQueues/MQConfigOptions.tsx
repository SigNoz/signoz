import { Select } from 'antd';

function MessagingQueuesConfigOptions(): JSX.Element {
	return (
		<div className="config-options">
			<Select placeholder="Consumer Groups" showSearch mode="multiple" />
			<Select placeholder="Topics" showSearch mode="multiple" />
			<Select placeholder="Partitions" showSearch mode="multiple" />
		</div>
	);
}

export default MessagingQueuesConfigOptions;
