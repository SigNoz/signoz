import { blue } from '@ant-design/colors';
import { CopyFilled } from '@ant-design/icons';
import { Button, Row } from 'antd';
import Editor from 'components/Editor';
import React, { useMemo } from 'react';
import { useCopyToClipboard } from 'react-use';

function JSONView({ logData }) {
    const [_state, copyToClipboard] = useCopyToClipboard();
    const LogJsonData = useMemo(() => JSON.stringify(logData, null, 2), [logData]);
    return (
        <div>
            <Row
                style={{
                    justifyContent: 'flex-end',
                    margin: '0.5rem 0',
                }}
            >
                <Button
                    size="small"
                    type="text"
                    onClick={(): void => copyToClipboard(LogJsonData)}
                >
                    <CopyFilled /> <span style={{ color: blue[5] }}>Copy to Clipboard</span>
                </Button>
            </Row>
            <div style={{ marginTop: '0.5rem' }}>
                <Editor value={LogJsonData} language="json" height="70vh" readOnly />
            </div>
        </div>
    );
}

export default JSONView;
