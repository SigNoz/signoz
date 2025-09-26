import './TextToolTip.style.scss';

import { blue, grey } from '@ant-design/colors';
import {
	QuestionCircleFilled,
	QuestionCircleOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import { themeColors } from 'constants/theme';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { ReactNode, useMemo } from 'react';

import { style } from './constant';

function TextToolTip({
	text,
	url,
	useFilledIcon = true,
	urlText,
	filledIcon,
	outlinedIcon,
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

	// Use provided icons or fallback to default icons
	const defaultFilledIcon = <QuestionCircleFilled style={iconStyle} />;
	const defaultOutlinedIcon = (
		<QuestionCircleOutlined style={iconOutlinedStyle} />
	);

	const renderIcon = (): ReactNode => {
		if (useFilledIcon) {
			return filledIcon ? (
				<div style={{ color: iconStyle.color }}>{filledIcon}</div>
			) : (
				defaultFilledIcon
			);
		}
		return outlinedIcon ? (
			<div style={{ color: iconOutlinedStyle.color }}>{outlinedIcon}</div>
		) : (
			defaultOutlinedIcon
		);
	};

	return <Tooltip overlay={overlay}>{renderIcon()}</Tooltip>;
}

TextToolTip.defaultProps = {
	url: '',
	urlText: '',
	useFilledIcon: true,
	filledIcon: undefined,
	outlinedIcon: undefined,
};
interface TextToolTipProps {
	url?: string;
	text: string;
	useFilledIcon?: boolean;
	urlText?: string;
	filledIcon?: ReactNode;
	outlinedIcon?: ReactNode;
}

export default TextToolTip;
