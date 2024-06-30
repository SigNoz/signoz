import './Tags.styles.scss';

import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { Tag } from 'antd/lib';
import Input from 'components/Input';
import { Check, X } from 'lucide-react';
import { TweenOneGroup } from 'rc-tween-one';
import React, { Dispatch, SetStateAction, useState } from 'react';

function Tags({ tags, setTags }: AddTagsProps): JSX.Element {
	const [inputValue, setInputValue] = useState<string>('');
	const [inputVisible, setInputVisible] = useState<boolean>(false);

	const handleInputConfirm = (): void => {
		if (tags.indexOf(inputValue) > -1) {
			return;
		}

		if (inputValue) {
			setTags([...tags, inputValue]);
		}
		setInputVisible(false);
		setInputValue('');
	};

	const handleClose = (removedTag: string): void => {
		const newTags = tags.filter((tag) => tag !== removedTag);
		setTags(newTags);
	};

	const showInput = (): void => {
		setInputVisible(true);
		setInputValue('');
	};

	const hideInput = (): void => {
		setInputValue('');
		setInputVisible(false);
	};

	const onChangeHandler = (
		value: string,
		func: Dispatch<SetStateAction<string>>,
	): void => {
		func(value);
	};

	const forMap = (tag: string): React.ReactElement => (
		<span key={tag} style={{ display: 'inline-block' }}>
			<Tag
				closable
				onClose={(e): void => {
					e.preventDefault();
					handleClose(tag);
				}}
			>
				{tag}
			</Tag>
		</span>
	);

	const tagChild = tags.map(forMap);

	const renderTagsAnimated = (): React.ReactElement => (
		<TweenOneGroup
			appear={false}
			className="tags"
			enter={{ scale: 0.8, opacity: 0, type: 'from', duration: 100 }}
			leave={{ opacity: 0, width: 0, scale: 0, duration: 200 }}
			onEnd={(e): void => {
				if (e.type === 'appear' || e.type === 'enter') {
					(e.target as any).style = 'display: inline-block';
				}
			}}
		>
			{tagChild}
		</TweenOneGroup>
	);

	return (
		<div className="tags-container">
			{renderTagsAnimated()}
			{inputVisible && (
				<div className="add-tag-container">
					<Input
						type="text"
						autoFocus
						value={inputValue}
						onChangeHandler={(event): void =>
							onChangeHandler(event.target.value, setInputValue)
						}
						onPressEnterHandler={handleInputConfirm}
					/>

					<div className="confirm-cancel-actions">
						<Button
							type="primary"
							className="periscope-btn"
							size="small"
							icon={<Check size={14} />}
							onClick={handleInputConfirm}
						/>

						<Button
							type="primary"
							className="periscope-btn"
							size="small"
							icon={<X size={14} />}
							onClick={hideInput}
						/>
					</div>
				</div>
			)}

			{!inputVisible && (
				<Button
					type="primary"
					size="small"
					style={{
						fontSize: '11px',
					}}
					icon={<PlusOutlined />}
					onClick={showInput}
				>
					New Tag
				</Button>
			)}
		</div>
	);
}

interface AddTagsProps {
	tags: string[];
	setTags: Dispatch<SetStateAction<string[]>>;
}

export default Tags;
