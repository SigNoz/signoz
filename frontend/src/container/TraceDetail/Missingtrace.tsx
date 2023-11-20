import { volcano } from '@ant-design/colors';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Popover, Typography } from 'antd';

function PopOverContent(): JSX.Element {
	return (
		<div>
			More details on missing spans{' '}
			<a
				href="https://signoz.io/docs/userguide/traces/#missing-spans"
				rel="noopener noreferrer"
				target="_blank"
			>
				here
			</a>
		</div>
	);
}

function MissingSpansMessage(): JSX.Element {
	return (
		<Popover content={PopOverContent} trigger="hover" placement="bottom">
			<Typography>
				<InfoCircleOutlined style={{ color: volcano[6], marginRight: '0.3rem' }} />
				This trace has missing spans
			</Typography>
		</Popover>
	);
}

export default MissingSpansMessage;
