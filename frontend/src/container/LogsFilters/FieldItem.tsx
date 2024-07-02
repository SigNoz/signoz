import { Button, Popover, Typography } from 'antd';
import Spinner from 'components/Spinner';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import {
	IField,
	IInterestingFields,
	ISelectedFields,
} from 'types/api/logs/fields';

import { ICON_STYLE } from './config';
import { Field } from './styles';

function FieldItem({
	name,
	buttonIcon,
	buttonOnClick,
	fieldData,
	fieldIndex,
	isLoading,
	iconHoverText,
}: FieldItemProps): JSX.Element {
	const [isHovered, setIsHovered] = useState<boolean>(false);
	const isDarkMode = useIsDarkMode();

	const onClickHandler = useCallback(() => {
		if (!isLoading && buttonOnClick) buttonOnClick({ fieldData, fieldIndex });
	}, [buttonOnClick, fieldData, fieldIndex, isLoading]);

	const renderContent = useMemo(() => {
		if (isLoading) {
			return <Spinner height="100%" style={{ margin: 0 }} />;
		}

		if (isHovered) {
			return (
				<Popover content={<Typography>{iconHoverText}</Typography>}>
					<Button
						size="small"
						type="text"
						icon={buttonIcon}
						onClick={onClickHandler}
					/>
				</Popover>
			);
		}

		return null;
	}, [buttonIcon, iconHoverText, isHovered, isLoading, onClickHandler]);

	const onMouseHoverHandler = useCallback(
		(value: boolean) => (): void => {
			setIsHovered(value);
		},
		[],
	);

	return (
		<Field
			onMouseEnter={onMouseHoverHandler(true)}
			onMouseLeave={onMouseHoverHandler(false)}
			isDarkMode={isDarkMode}
		>
			<Typography style={ICON_STYLE.PLUS}>{name}</Typography>

			{renderContent}
		</Field>
	);
}

interface FieldItemProps {
	name: string;
	buttonIcon: ReactNode;
	buttonOnClick: (props: {
		fieldData: IInterestingFields | ISelectedFields;
		fieldIndex: number;
	}) => void;
	fieldData: IField;
	fieldIndex: number;
	isLoading: boolean;
	iconHoverText: string;
}

export default FieldItem;
