import { volcano } from '@ant-design/colors';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Popover } from 'antd';
import React from 'react';

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
			<div
				style={{
					textAlign: 'center',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					margin: '1rem 0',
				}}
			>
				<InfoCircleOutlined
					style={{ color: volcano[6], fontSize: '1.4rem', marginRight: '0.3rem' }}
				/>{' '}
				This trace has missing spans
			</div>
		</Popover>
	);
}

export default MissingSpansMessage;
