import React, { useEffect, useRef } from 'react';
import Player, { RRwebPlayerOptions } from 'rrweb-player';
import { eventWithTime } from '@rrweb/types';
import 'rrweb-player/dist/style.css'; // Import the styles for the player

interface RRWebPlayerProps {
	events: eventWithTime[];
	options?: Partial<RRwebPlayerOptions['props']>;
	className?: string;
	style?: React.CSSProperties;
}

const RRWebPlayer: React.FC<RRWebPlayerProps> = ({
	events,
	options = {},
	className = '',
	style = {},
}) => {
	const playerRef = useRef<HTMLDivElement>(null);
	const playerInstanceRef = useRef<any>(null);

	useEffect(() => {
		if (!playerRef.current || !events || events.length === 0) {
			return;
		}

		// Clean up previous instance if it exists
		if (playerInstanceRef.current) {
			// Remove the previous player element
			if (playerRef.current) {
				playerRef.current.innerHTML = '';
			}
		}

		// Create new player instance using the imported Player
		playerInstanceRef.current = new Player({
			target: playerRef.current as HTMLElement,
			props: {
				events,
				...options,
			},
		});

		// Cleanup function
		return () => {
			if (playerInstanceRef.current && playerRef.current) {
				playerRef.current.innerHTML = '';
				playerInstanceRef.current = null;
			}
		};
	}, [events, options]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (playerInstanceRef.current && playerRef.current) {
				playerRef.current.innerHTML = '';
				playerInstanceRef.current = null;
			}
		};
	}, []);

	if (!events || events.length === 0) {
		return (
			<div className={`rrweb-player-empty ${className}`} style={style}>
				<p>No session events available</p>
			</div>
		);
	}

	return (
		<div
			ref={playerRef}
			className={`rrweb-player-container ${className}`}
			style={style}
		/>
	);
};

export default RRWebPlayer;
