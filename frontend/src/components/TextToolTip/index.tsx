import { grey } from '@ant-design/colors';
import { QuestionCircleFilled } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { themeColors } from 'constants/theme';
import { useIsDarkMode } from 'hooks/useDarkMode';
import React, { useMemo } from 'react';

import { style } from './styles';

function TextToolTip({ text, url }: TextToolTipProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const overlay = useMemo(
		() => (
			<div>
				{`${text} `}
				{url && (
					<a href={url} rel="noopener noreferrer" target="_blank">
						here
					</a>
				)}
			</div>
		),
		[text, url],
	);

	const iconStyle = useMemo(
		() => ({
			...style,
			color: isDarkMode ? themeColors.whiteCream : grey[0],
		}),
		[isDarkMode],
	);

	return (
		<Tooltip overlay={overlay}>
			<QuestionCircleFilled style={iconStyle} />
		</Tooltip>
	);
}

TextToolTip.defaultProps = {
	url: '',
};
interface TextToolTipProps {
	url?: string;
	text: string;
}

export default TextToolTip;
