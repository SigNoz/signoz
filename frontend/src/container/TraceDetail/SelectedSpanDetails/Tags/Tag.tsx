import { Fragment, useMemo } from 'react';
import { Tooltip } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';
import { Copy, Check } from 'lucide-react';
import { ITraceTag } from 'types/api/trace/getTraceItem';

import EllipsedButton from '../EllipsedButton';
import { CustomSubText, CustomSubTitle, SubTextContainer } from '../styles';
import { CommonTagsProps } from '.';
import { Container } from './styles';

import './Tags.styles.scss';

function Tag({ tags, onToggleHandler, setText }: TagProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const { copyToClipboard, isCopied, id: copiedId } = useCopyToClipboard();

	const { value, isEllipsed } = useMemo(() => {
		const value = tags.key === 'error' ? 'true' : tags.value;

		return {
			value,
			isEllipsed: value.length > 24,
		};
	}, [tags]);

	return (
		<Fragment key={JSON.stringify(tags)}>
			{tags.value && (
				<Container>
					<CustomSubTitle>
						{tags.key}
						<Tooltip title={isCopied && copiedId === `key-${tags.key}` ? 'Copied!' : 'Copy key'}>
							<span
								className="copy-icon-button"
								role="button"
								tabIndex={0}
								onClick={(): void => copyToClipboard(tags.key, `key-${tags.key}`)}
								onKeyDown={(e): void => {
									if (e.key === 'Enter' || e.key === ' ') copyToClipboard(tags.key, `key-${tags.key}`);
								}}
							>
								{isCopied && copiedId === `key-${tags.key}` ? (
									<Check size={12} />
								) : (
									<Copy size={12} />
								)}
							</span>
						</Tooltip>
					</CustomSubTitle>
					<SubTextContainer isDarkMode={isDarkMode}>
						<Tooltip
							overlayClassName="tagTooltip"
							placement="left"
							autoAdjustOverflow
							title={value}
						>
							<CustomSubText
								ellipsis={{
									rows: isEllipsed ? 2 : 0,
								}}
								isDarkMode={isDarkMode}
							>
								{value}
							</CustomSubText>

							{isEllipsed && (
								<EllipsedButton
									{...{
										event: tags.key,
										onToggleHandler,
										setText,
										value,
										buttonText: 'View full value',
									}}
								/>
							)}
						</Tooltip>
						<Tooltip title={isCopied && copiedId === `val-${tags.key}` ? 'Copied!' : 'Copy value'}>
							<span
								className="copy-icon-button"
								role="button"
								tabIndex={0}
								onClick={(): void => copyToClipboard(value, `val-${tags.key}`)}
								onKeyDown={(e): void => {
									if (e.key === 'Enter' || e.key === ' ') copyToClipboard(value, `val-${tags.key}`);
								}}
							>
								{isCopied && copiedId === `val-${tags.key}` ? (
									<Check size={12} />
								) : (
									<Copy size={12} />
								)}
							</span>
						</Tooltip>
					</SubTextContainer>
				</Container>
			)}
		</Fragment>
	);
}

interface TagProps extends CommonTagsProps {
	tags: ITraceTag;
}

export default Tag;
