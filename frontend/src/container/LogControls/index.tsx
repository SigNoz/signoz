import { ArrowLeftOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Button, Select } from 'antd'
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppState } from 'store/reducers'
import { SET_LOG_LINES_PER_PAGE } from 'types/actions/logs'
import ILogsReducer from 'types/reducer/logs'
import { Container } from './styles'
const { Option } = Select

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

function LogControls() {

    const { logLinesPerPage } = useSelector<AppState, ILogsReducer>((state) => state.logs);
    const dispatch = useDispatch();

    const handleLogLinesPerPageChange = (e: number) => {
        dispatch({
            type: SET_LOG_LINES_PER_PAGE,
            payload: e
        })
    }
    return <Container>
        <Button size='small' type='link'><LeftOutlined /> Previous</Button>
        <Button size="small" type='link'>Next <RightOutlined /></Button>
        <Select style={{ width: 120 }} value={logLinesPerPage} onChange={handleLogLinesPerPageChange}>
            {ITEMS_PER_PAGE_OPTIONS.map((count) => {
                return <Option key={count} value={count} >{`${count} / page`}</Option>
            })}
        </Select>
    </Container>
}

export default LogControls
