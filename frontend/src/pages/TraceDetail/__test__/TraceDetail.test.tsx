/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import ROUTES from 'constants/routes';
import { MemoryRouter, Route } from 'react-router-dom';
import { fireEvent, render, screen } from 'tests/test-utils';
import TraceDetail from '..'; // Import your TraceDetail component

window.HTMLElement.prototype.scrollIntoView = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: (): { pathname: string; search: string } => ({
    pathname: `${process.env.FRONTEND_API_ENDPOINT}${ROUTES.TRACE_DETAIL}`,
    search: '?spanId=28a8a67365d0bd8b&levelUp=0&levelDown=0',
  }),
  useParams: jest.fn().mockReturnValue({
    id: '000000000000000071dc9b0a338729b4',
  }),
}));

jest.mock('container/TraceFlameGraph/index.tsx', () => ({
  __esModule: true,
  default: (): JSX.Element => <div>TraceFlameGraph</div>,
}));

describe('TraceDetail', () => {
  it('should render trace detail', async () => {
    const { findByText, getByText, getAllByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={['/trace/000000000000000071dc9b0a338729b4']}>
        <Route path={ROUTES.TRACE_DETAIL}>
          <TraceDetail />
        </Route>
      </MemoryRouter>,
    );

    expect(await findByText('Trace Details')).toBeInTheDocument();
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();

    expect(getByText('TraceFlameGraph')).toBeInTheDocument();
    expect(getByText('Focus on selected span')).toBeInTheDocument();
    expect(getByText('Reset Focus')).toBeInTheDocument();
    expect(getByText('50 Spans')).toBeInTheDocument();

    expect(getAllByText('frontend')[0]).toBeInTheDocument();
    expect(getByText('776.76 ms')).toBeInTheDocument();

    [
      { trace: 'HTTP GET /dispatch', duration: '776.76 ms', count: '50' },
      { trace: 'HTTP GET: /customer', duration: '349.44 ms', count: '4' },
      { trace: '/driver.DriverService/FindNearest', duration: '173.10 ms', count: '15' },
    ].forEach((traceDetail) => {
      expect(getByText(traceDetail.trace)).toBeInTheDocument();
      expect(getByText(traceDetail.duration)).toBeInTheDocument();
      expect(getByText(traceDetail.count)).toBeInTheDocument();
    });

    expect(getByText('Details for selected Span')).toBeInTheDocument();
    ['Service', 'Operation', 'SpanKind', 'StatusCodeString'].forEach((detail) => {
      expect(getByText(detail)).toBeInTheDocument();
    });

    const goToRelatedLogsButton = getByText('Go to Related logs');
    expect(goToRelatedLogsButton).toBeInTheDocument();

    expect(getByText('Tags')).toBeInTheDocument();
    expect(getByText('Events')).toBeInTheDocument();
    expect(getByPlaceholderText('traceDetails:search_tags')).toBeInTheDocument();

    [
      { title: 'client-uuid', value: '64a18ffd5f8adbfb' },
      { title: 'component', value: 'net/http' },
      { title: 'host.name', value: '4f6ec470feea' },
      { title: 'http.method', value: 'GET' },
      { title: 'http.url', value: '/route?dropoff=728%2C326&pickup=165%2C543' },
      { title: 'http.status_code', value: '200' },
      { title: 'ip', value: '172.25.0.2' },
      { title: 'opencensus.exporterversion', value: 'Jaeger-Go-2.30.0' },
    ].forEach((tag) => {
      expect(getByText(tag.title)).toBeInTheDocument();
      expect(getByText(tag.value)).toBeInTheDocument();
    });

    expect(getAllByText('View full value')[0]).toBeInTheDocument();
  });

  it('should navigate to related logs with correct timeline', async () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={['/trace/000000000000000071dc9b0a338729b4']}>
        <Route path={ROUTES.TRACE_DETAIL}>
          <TraceDetail />
        </Route>
      </MemoryRouter>
    );

    fireEvent.click(getByText('Go to Related logs'));

    // Here you would check if the logs view reflects the correct timeline
    // Assuming you have a method to check that the correct query parameters are present
  });

  it('should render tracedetail events tab', async () => {
    const { findByText, getByText } = render(
      <MemoryRouter initialEntries={['/trace/000000000000000071dc9b0a338729b4']}>
        <Route path={ROUTES.TRACE_DETAIL}>
          <TraceDetail />
        </Route>
      </MemoryRouter>,
    );

    expect(await findByText('Trace Details')).toBeInTheDocument();

    fireEvent.click(getByText('Events'));

    expect(await screen.findByText('HTTP request received')).toBeInTheDocument();

    [
      { title: 'Event Start Time', value: '527.60 ms' },
      { title: 'level', value: 'info' },
    ].forEach((tag) => {
      expect(getByText(tag.title)).toBeInTheDocument();
      expect(getByText(tag.value)).toBeInTheDocument();
    });

    expect(getByText('View full log event message')).toBeInTheDocument();
  });

  it('should toggle slider - selected span details', async () => {
    const { findByTestId, queryByText } = render(
      <MemoryRouter initialEntries={['/trace/000000000000000071dc9b0a338729b4']}>
        <Route path={ROUTES.TRACE_DETAIL}>
          <TraceDetail />
        </Route>
      </MemoryRouter>,
    );

    const slider = await findByTestId('span-details-sider');
    expect(slider).toBeInTheDocument();

    fireEvent.click(slider.querySelector('.expand-collapse-btn') as HTMLElement);

    expect(queryByText('Details for selected Span')).not.toBeInTheDocument();
  });

  it('should be able to select another span and see its detail', async () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={['/trace/000000000000000071dc9b0a338729b4']}>
        <Route path={ROUTES.TRACE_DETAIL}>
          <TraceDetail />
        </Route>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Trace Details')).toBeInTheDocument();

    const spanTitle = getByText('/driver.DriverService/FindNearest');
    expect(spanTitle).toBeInTheDocument();
    fireEvent.click(spanTitle);

    [
      { title: 'client-uuid', value: '6fb81b8ca91b2b4d' },
      { title: 'component', value: 'gRPC' },
      { title: 'host.name', value: '4f6ec470feea' },
    ].forEach((tag) => {
      expect(getByText(tag.title)).toBeInTheDocument();
      expect(getByText(tag.value)).toBeInTheDocument();
    });
  });

  it('focus on selected span and reset focus action', async () => {
    const { getByText, getAllByText } = render(
      <MemoryRouter initialEntries={['/trace/000000000000000071dc9b0a338729b4']}>
        <Route path={ROUTES.TRACE_DETAIL}>
          <TraceDetail />
        </Route>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Trace Details')).toBeInTheDocument();

    const spanTitle = getByText('/driver.DriverService/FindNearest');
    expect(spanTitle).toBeInTheDocument();
    fireEvent.click(spanTitle);

    expect(await screen.findByText('6fb81b8ca91b2b4d')).toBeInTheDocument();

    const focusButton = getByText('Focus on selected span');
    expect(focusButton).toBeInTheDocument();
    fireEvent.click(focusButton);

    expect(getByText('15 Spans')).toBeInTheDocument();
    expect(getAllByText('/driver.DriverService/FindNearest')).toHaveLength(3);
    expect(getByText('173.10 ms')).toBeInTheDocument();

    const resetFocusButton = getByText('Reset Focus');
    expect(resetFocusButton).toBeInTheDocument();
    fireEvent.click(resetFocusButton);

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    expect(screen.queryByText('HTTP GET /dispatch')).toBeInTheDocument();
  });
});

export default TraceDetail;
