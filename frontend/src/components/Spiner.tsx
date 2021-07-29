import React from 'react';
import { Spin } from 'antd';
import styled from "styled-components";
import { LoadingOutlined } from '@ant-design/icons';
const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

const SpinerStyle = styled.div`
position: fixed;
z-index: 999;
height: 4em;
overflow: visible;
margin: auto;
top: 0;
left: 50%;
bottom: 0;
right: 0;
`;

export const CustomSpinner = ({
    size,
    message,
}:{
    size:string,
    message:string,
})=>{
    return(
        <>
        <SpinerStyle>
                <Spin size={size} tip={message} indicator={antIcon}/>
        </SpinerStyle>
        </>
    )
}

export const DefaultSpinner = ()=>{
    return(
        <>
            <Spin indicator={antIcon}/>
        </>
    )
}