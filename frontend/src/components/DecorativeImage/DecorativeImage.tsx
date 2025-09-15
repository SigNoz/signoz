type DecorativeImageProps = {
    src: string;
    className?: string;
    [key: string]: unknown;
};

function DecorativeImage({
    src,
    className,
    ...rest
}: DecorativeImageProps): JSX.Element {
    return (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <img className={className} alt="" role="presentation" src={src} {...rest} />
    );
}

export default DecorativeImage;

DecorativeImage.defaultProps = {
    className: '',
};
