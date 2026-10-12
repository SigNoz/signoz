import { Image } from '@signozhq/icons';

import styles from '../AIThreadMessage.module.scss';

interface MediaPartProps {
	modality?: string;
	mimeType?: string;
	name?: string;
}

function MediaPart({ modality, mimeType, name }: MediaPartProps): JSX.Element {
	return (
		<span className={styles.mediaChip} data-testid="ai-media-part">
			<Image size={12} />
			<span className="translate-safe">
				{name || mimeType || modality || 'Media'}
			</span>
		</span>
	);
}

MediaPart.defaultProps = {
	modality: undefined,
	mimeType: undefined,
	name: undefined,
};

export default MediaPart;
