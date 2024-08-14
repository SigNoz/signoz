import { Select } from 'antd';

function MessagingQueuesConfigOptions(): JSX.Element {
	return (
		<div className="config-options">
			<Select placeholder="Consumer Group" showSearch />
			<Select placeholder="Topic" showSearch />
			<Select placeholder="Partition" showSearch />
		</div>
	);
}

export default MessagingQueuesConfigOptions;
