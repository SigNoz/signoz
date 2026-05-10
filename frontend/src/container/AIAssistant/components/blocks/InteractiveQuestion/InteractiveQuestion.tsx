import { useState } from 'react';
import cx from 'classnames';
import { Button } from '@signozhq/ui/button';
import { Checkbox, Radio } from 'antd';

import { useAIAssistantStore } from '../../../store/useAIAssistantStore';
import { useMessageContext } from '../../MessageContext';

import blockStyles from '../Block.module.scss';
import styles from './InteractiveQuestion.module.scss';

interface Option {
	value: string;
	label: string;
}

export interface QuestionData {
	question?: string;
	type?: 'radio' | 'checkbox';
	options: (string | Option)[];
}

function normalizeOption(opt: string | Option): Option {
	return typeof opt === 'string' ? { value: opt, label: opt } : opt;
}

export default function InteractiveQuestion({
	data,
}: {
	data: QuestionData;
}): JSX.Element {
	const { question, type = 'radio', options } = data;
	const normalized = options.map(normalizeOption);

	const { messageId } = useMessageContext();
	const answeredBlocks = useAIAssistantStore((s) => s.answeredBlocks);
	const markBlockAnswered = useAIAssistantStore((s) => s.markBlockAnswered);
	const sendMessage = useAIAssistantStore((s) => s.sendMessage);

	// Persist selected state locally only for the pending (not-yet-submitted) case
	const [selected, setSelected] = useState<string[]>([]);

	// Durable answered state from the store — survives re-renders/remounts
	const answeredText = messageId ? answeredBlocks[messageId] : undefined;
	const isAnswered = answeredText !== undefined;

	const handleSubmit = (values: string[]): void => {
		if (values.length === 0) {
			return;
		}
		const answer = values.join(', ');
		if (messageId) {
			markBlockAnswered(messageId, answer);
		}
		sendMessage(answer);
	};

	if (isAnswered) {
		return (
			<div className={cx(blockStyles.block, styles.answered)}>
				<span className={styles.check}>✓</span>
				<span className={styles.answerText}>{answeredText}</span>
			</div>
		);
	}

	return (
		<div className={blockStyles.block}>
			{question && <p className={blockStyles.title}>{question}</p>}

			{type === 'radio' ? (
				<Radio.Group
					className={styles.options}
					onChange={(e): void => {
						setSelected([e.target.value]);
						handleSubmit([e.target.value]);
					}}
				>
					{normalized.map((opt) => (
						<Radio key={opt.value} value={opt.value} className={styles.option}>
							{opt.label}
						</Radio>
					))}
				</Radio.Group>
			) : (
				<>
					<Checkbox.Group
						className={cx(styles.options, styles.checkbox)}
						onChange={(vals): void => setSelected(vals as string[])}
					>
						{normalized.map((opt) => (
							<Checkbox key={opt.value} value={opt.value} className={styles.option}>
								{opt.label}
							</Checkbox>
						))}
					</Checkbox.Group>
					<Button
						variant="solid"
						size="sm"
						className={styles.submit}
						disabled={selected.length === 0}
						onClick={(): void => handleSubmit(selected)}
					>
						Confirm
					</Button>
				</>
			)}
		</div>
	);
}
