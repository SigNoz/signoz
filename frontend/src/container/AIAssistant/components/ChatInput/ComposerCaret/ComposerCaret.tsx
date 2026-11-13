import { RefObject } from 'react';
import cx from 'classnames';

import { useComposerCaret } from './useComposerCaret';

import styles from './ComposerCaret.module.scss';

interface ComposerCaretProps {
	textareaRef: RefObject<HTMLTextAreaElement>;
	value: string;
}

export default function ComposerCaret({
	textareaRef,
	value,
}: ComposerCaretProps): JSX.Element {
	const { caret, isTyping, trails, removeTrail } = useComposerCaret(
		textareaRef,
		value,
	);

	return (
		<>
			{trails.map((trail) => (
				<span
					key={trail.id}
					className={cx(styles.trail, { [styles.isFaint]: trail.faint })}
					style={{
						left: trail.left,
						top: trail.top,
						width: trail.width,
						height: trail.height,
					}}
					onAnimationEnd={(): void => removeTrail(trail.id)}
					aria-hidden
				/>
			))}
			{caret && (
				<span
					className={cx(styles.caret, { [styles.isTyping]: isTyping })}
					style={{
						transform: `translate(${caret.left}px, ${caret.top}px)`,
						height: caret.height,
					}}
					aria-hidden
				/>
			)}
		</>
	);
}
