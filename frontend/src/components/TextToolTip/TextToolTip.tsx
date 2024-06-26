import './TextToolTip.style.scss';

import { blue, grey } from '@ant-design/colors';
import {
	QuestionCircleFilled,
	QuestionCircleOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import { themeColors } from 'constants/theme';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useMemo } from 'react';

import { style } from './constant';

function TextToolTip({
	text,
	url,
	useFilledIcon = true,
	urlText,
}: TextToolTipProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const onClickHandler = (
		event: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
	): void => {
		event.stopPropagation();
	};

	const overlay = useMemo(
		() => (
			<div className="overlay--text-wrap">
				{`${text} `}
				{url && (
					<a
						// Stopping event propagation on click so that parent click listener are not triggered
						onClick={onClickHandler}
						href={url}
						rel="noopener noreferrer"
						target="_blank"
					>
						{urlText || 'here'}
					</a>
				)}
			</div>
		),
		[text, url, urlText],
	);

	const iconStyle = useMemo(
		() => ({
			...style,
			color: isDarkMode ? themeColors.whiteCream : grey[0],
		}),
		[isDarkMode],
	);

	const iconOutlinedStyle = useMemo(
		() => ({
			...style,
			color: isDarkMode ? themeColors.navyBlue : blue[6],
		}),
		[isDarkMode],
	);

	return (
		<Tooltip overlay={overlay}>
			{useFilledIcon ? (
				<QuestionCircleFilled style={iconStyle} />
			) : (
				<QuestionCircleOutlined style={iconOutlinedStyle} />
			)}
		</Tooltip>
	);
}

TextToolTip.defaultProps = {
	url: '',
	urlText: '',
	useFilledIcon: true,
};
interface TextToolTipProps {
	url?: string;
	text: string;
	useFilledIcon?: boolean;
	urlText?: string;
}

export default TextToolTip;
