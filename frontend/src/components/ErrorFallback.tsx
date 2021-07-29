import React from "react";
import { Alert, Row, Col } from "antd";
import styled from "styled-components";

const FallbackWrapper = styled.div`
    margin: 200
`;

export const ErrorFallback = () => {
    return (
        <FallbackWrapper>
            <Row justify="space-around" align="middle" >
                <Col span={12}>
                    <Alert
                        message="Error Something Went Wrong!"
                        showIcon
                        description="Hi Sorry Due to Some technical difficulty this error Happened We are Working hard fix this! Please Reload the Page."
                        type="error"
                    />
                </Col>
            </Row>
        </FallbackWrapper>
    );
};