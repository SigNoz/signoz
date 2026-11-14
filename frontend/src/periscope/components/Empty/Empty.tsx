import DefaultEmptyImage from './DefaultEmptyImage';
import SimpleEmptyImage from './SimpleEmptyImage';
import styles from './Empty.module.scss';
import type { EmptyProps } from './types';
import { getEmptyClassName, getImageAlt, resolveDescription } from './utils';

const PRESENTED_IMAGE_DEFAULT = <DefaultEmptyImage />;
const PRESENTED_IMAGE_SIMPLE = <SimpleEmptyImage />;

/** Drop-in replacement for antd's `Empty` (5.11). */
function Empty({
	className,
	style,
	image = PRESENTED_IMAGE_DEFAULT,
	imageStyle,
	description,
	children,
	...rest
}: EmptyProps): JSX.Element {
	const resolvedDescription = resolveDescription(description);

	return (
		<div
			className={getEmptyClassName(className, image === PRESENTED_IMAGE_SIMPLE)}
			style={style}
			{...rest}
		>
			<div className={styles.image} style={imageStyle}>
				{typeof image === 'string' ? (
					<img alt={getImageAlt(resolvedDescription)} src={image} />
				) : (
					image
				)}
			</div>
			{resolvedDescription && (
				<div className={styles.description}>{resolvedDescription}</div>
			)}
			{children && <div className={styles.footer}>{children}</div>}
		</div>
	);
}

Empty.PRESENTED_IMAGE_DEFAULT = PRESENTED_IMAGE_DEFAULT;
Empty.PRESENTED_IMAGE_SIMPLE = PRESENTED_IMAGE_SIMPLE;

export default Empty;
