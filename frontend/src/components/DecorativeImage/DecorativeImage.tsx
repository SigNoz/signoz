import React from "react";


function DecorativeImage({
    src,
    className,
    ...rest
}: React.ImgHTMLAttributes<HTMLImageElement>): JSX.Element {
    return (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <img className={className} alt="" role="presentation" src={src} {...rest} />
    );
}

export default DecorativeImage;


