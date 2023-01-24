const getMicroSeconds = ({ time }: GetMicroSecondsProps): string =>
	(time / 1000).toString();

interface GetMicroSecondsProps {
	time: number;
}

export default getMicroSeconds;
