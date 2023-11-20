import './CodeCopyBtn.scss';

import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import cx from 'classnames';
import { useState } from 'react';

export default function CodeCopyBtn({
	children,
}: {
	children: React.ReactNode;
}): JSX.Element {
	const [isSnippetCopied, setIsSnippetCopied] = useState(false);

	const handleClick = (): void => {
		if (children && Array.isArray(children)) {
			setIsSnippetCopied(true);
			navigator.clipboard.writeText(children[0].props.children[0]).finally(() => {
				setTimeout(() => {
					setIsSnippetCopied(false);
				}, 1000);
			});
		}
	};

	return (
		<div className={cx('code-copy-btn', isSnippetCopied ? 'copied' : '')}>
			<button type="button" onClick={handleClick}>
				{!isSnippetCopied ? <CopyOutlined /> : <CheckOutlined />}
			</button>
		</div>
	);
}
