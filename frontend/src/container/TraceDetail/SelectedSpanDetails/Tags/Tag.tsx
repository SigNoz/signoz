import './Tags.styles.scss';

import { Tooltip } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Fragment, useMemo } from 'react';
import { ITraceTag } from 'types/api/trace/getTraceItem';

import EllipsedButton from '../EllipsedButton';
import { CustomSubText, CustomSubTitle, SubTextContainer } from '../styles';
import { CommonTagsProps } from '.';
import { Container } from './styles';

function Tag({ tags, onToggleHandler, setText }: TagProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

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
					<CustomSubTitle>{tags.key}</CustomSubTitle>
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
