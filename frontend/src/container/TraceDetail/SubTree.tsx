import { volcano } from '@ant-design/colors';
import { WarningOutlined } from '@ant-design/icons';
import { Typography } from 'antd';

function SubTreeMessage(): JSX.Element {
	return (
		<Typography>
			<WarningOutlined style={{ color: volcano[6], marginRight: '0.3rem' }} />
			Only part of trace is shown, for more info{' '}
			<a
				href="https://www.loom.com/share/3a26d398278f49919dd185d9c4344b05​"
				target="_blank"
				style={{ textDecoration: 'underline' }}
				rel="noreferrer"
			>
				watch this
			</a>
		</Typography>
	);
}

export default SubTreeMessage;
