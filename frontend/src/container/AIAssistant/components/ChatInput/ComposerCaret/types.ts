export interface CaretBox {
	left: number;
	top: number;
	height: number;
}

export interface CaretTrail extends CaretBox {
	id: number;
	width: number;
	faint: boolean;
}
