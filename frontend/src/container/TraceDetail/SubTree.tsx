import { volcano } from '@ant-design/colors';
import { WarningOutlined } from '@ant-design/icons';
import { Popover, Typography } from 'antd';

function PopOverContent(): JSX.Element {
	return (
		<div>
			To explore full trace{' '}
			<a
				href="https://www.loom.com/share/3a26d398278f49919dd185d9c4344b05​"
				rel="noopener noreferrer"
				target="_blank"
			>
				watch this
			</a>
		</div>
	);
}

function SubTreeMessage(): JSX.Element {
	return (
		<Popover content={PopOverContent} trigger="hover" placement="bottom">
			<Typography>
				<WarningOutlined style={{ color: volcano[6], marginRight: '0.3rem' }} />
				You are seeing a subtree/part of trace
			</Typography>
		</Popover>
	);
}

export default SubTreeMessage;
