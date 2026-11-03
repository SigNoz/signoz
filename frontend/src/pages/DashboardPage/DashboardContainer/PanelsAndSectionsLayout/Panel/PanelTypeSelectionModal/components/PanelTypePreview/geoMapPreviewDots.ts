// One land dot per `#` on a 36 × 14 grid.
const WORLD_ROWS = [
	'      ####           #######        ',
	'   ########  ##    ############     ',
	'  ##########      ###############   ',
	'   ########      ################## ',
	'    ######       ################   ',
	'     ####         ##############    ',
	'      ###       ######  ########    ',
	'        ##      #######   ####      ',
	'        ####     ######    ##   #   ',
	'         #####    #####        ##   ',
	'         ####      ###       ####   ',
	'          ###      ##        #####  ',
	'          ##                  ##    ',
	'          #                         ',
];

function continentIntensity(x: number, y: number): number {
	if (x < 15) {
		return y < 7 ? 0.95 : 0.38; // North / South America
	}
	if (x < 23) {
		return y < 6 ? 0.75 : 0.2; // Europe / Africa
	}
	return y >= 9 && x >= 27 ? 0.3 : 0.5; // Oceania / Asia
}

/** `[cx, cy, intensity]` per land dot of the geo map sketch. */
export const WORLD_DOTS = WORLD_ROWS.flatMap((row, y) =>
	row
		.split('')
		.flatMap((cell, x) =>
			cell === '#' ? [[x + 0.5, y + 0.5, continentIntensity(x, y)]] : [],
		),
);
