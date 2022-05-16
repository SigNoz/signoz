import { Input } from 'antd';
import React, { useEffect, useState } from 'react';

import { InputContainer } from '../styles';

function PromQLQueryBuilder({
    query,
    legend,
    onQueryChange,
    onLegendChange,
}): JSX.Element {
    return (
        <>
            <InputContainer>
                <Input
                    onChange={(event): void => onQueryChange(event.target.value)}
                    size="middle"
                    defaultValue={query}
                    addonBefore="PromQL Query"

                />
            </InputContainer>

            <InputContainer>
                <Input
                    onChange={(event): void => onLegendChange(event.target.value)}
                    size="middle"
                    defaultValue={legend}
                    addonBefore="Legend Format"
                />
            </InputContainer>
        </>
    );
}

export default PromQLQueryBuilder;
