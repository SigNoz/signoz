/* eslint-disable prefer-destructuring */
import './CodeCopyBtn.scss';

import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import cx from 'classnames';
import React, { useState } from 'react';

function CodeCopyBtn({
	children,
	onCopyClick,
}: {
	children: React.ReactNode;
	onCopyClick?: (additionalInfo?: Record<string, unknown>) => void;
}): JSX.Element {
	const [isSnippetCopied, setIsSnippetCopied] = useState(false);

	const handleClick = (): void => {
		let copiedText = '';
		if (children && Array.isArray(children)) {
			setIsSnippetCopied(true);
			navigator.clipboard.writeText(children[0].props.children[0]).finally(() => {
				copiedText = (children[0].props.children[0] as string).slice(0, 200); // slicing is done due to the limitation in accepted char length in attributes
				setTimeout(() => {
					setIsSnippetCopied(false);
				}, 1000);
			});
			copiedText = (children[0].props.children[0] as string).slice(0, 200);
		}

		onCopyClick?.({ copiedText });
	};

	return (
		<div className={cx('code-copy-btn', isSnippetCopied ? 'copied' : '')}>
			<button type="button" onClick={handleClick}>
				{!isSnippetCopied ? <CopyOutlined /> : <CheckOutlined />}
			</button>
		</div>
	);
}

CodeCopyBtn.defaultProps = {
	onCopyClick: (): void => {},
};

export default CodeCopyBtn;
