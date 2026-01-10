import math
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Dict, Generator, List, Optional, Tuple

from fixtures.metrics import Metrics


@dataclass
class DeterministicAnomalies:
    # resets: (offset)
    COUNTER_RESET_OFFSETS: List[timedelta] = field(
        default_factory=lambda: [
            timedelta(hours=6),
            timedelta(hours=24),
        ]
    )

    # gaps: (offset, duration)
    DATA_GAP_OFFSETS: List[Tuple[timedelta, timedelta]] = field(
        default_factory=lambda: [
            (timedelta(hours=12), timedelta(minutes=30)),  # 30 min gap
            (timedelta(hours=36), timedelta(minutes=15)),  # 15 min gap
        ]
    )

    # spikes: (offset, multiplier)
    SPIKE_OFFSETS: List[Tuple[timedelta, float]] = field(
        default_factory=lambda: [
            (timedelta(hours=18), 10.0),  # at this point the value spikes 10x
        ]
    )

    # 0 value offsets
    ZERO_VALUE_OFFSETS: List[timedelta] = field(
        default_factory=lambda: [
            timedelta(hours=30),  # at this point the value drops to zero
        ]
    )

    def is_in_gap(self, offset: timedelta) -> bool:
        for gap_start, gap_duration in self.DATA_GAP_OFFSETS:
            if gap_start <= offset < gap_start + gap_duration:
                return True
        return False

    def get_spike_multiplier(self, offset: timedelta) -> float:
        for spike_offset, multiplier in self.SPIKE_OFFSETS:
            # lasts for 1 minute, make it configurable?
            if spike_offset <= offset < spike_offset + timedelta(minutes=1):
                return multiplier
        return 1.0

    def should_reset_counter(self, offset: timedelta) -> bool:
        for reset_offset in self.COUNTER_RESET_OFFSETS:
            if reset_offset <= offset < reset_offset + timedelta(minutes=1):
                return True
        return False

    def should_be_zero(self, offset: timedelta) -> bool:
        for zero_offset in self.ZERO_VALUE_OFFSETS:
            # window of 5 minutes
            if zero_offset <= offset < zero_offset + timedelta(minutes=5):
                return True
        return False


class MetricsDataGenerator:
    def __init__(
        self,
        start_time: datetime,
        end_time: datetime,
        step_seconds: int = 60,
        seed: int = 42,
    ):
        self.start = start_time
        self.end = end_time
        self.step = step_seconds
        self.anomalies = DeterministicAnomalies()
        self.rng = random.Random(seed)

        duration = (self.end - self.start).total_seconds()
        self.num_points = int(duration / step_seconds)

    def _timestamps(self) -> Generator[datetime, None, None]:
        current = self.start
        while current < self.end:
            yield current
            current += timedelta(seconds=self.step)

    def _offset_from_start(self, ts: datetime) -> timedelta:
        return ts - self.start

    def steady_with_noise(
        self, base: float, noise_pct: float = 0.1
    ) -> Generator[float, None, None]:
        for _ in range(self.num_points):
            noise = self.rng.uniform(-noise_pct, noise_pct) * base
            yield base + noise

    def diurnal_pattern(
        self, min_val: float, max_val: float
    ) -> Generator[float, None, None]:
        amplitude = (max_val - min_val) / 2
        baseline = min_val + amplitude

        for i, ts in enumerate[datetime](self._timestamps()):
            # peak at 14:00
            hour = ts.hour + ts.minute / 60.0
            # shift so peak is at 14:00
            phase = (hour - 14) * (2 * math.pi / 24)
            value = baseline + amplitude * math.cos(phase)
            # add some noise
            noise = self.rng.uniform(-0.05, 0.05) * value
            yield max(0, value + noise)
            if i >= self.num_points - 1:
                break

    def monotonic_increasing(
        self, rate_per_minute: float, noise_pct: float = 0.1
    ) -> Generator[float, None, None]:
        value = 0.0
        for ts in self._timestamps():
            offset = self._offset_from_start(ts)

            # reset now?
            if self.anomalies.should_reset_counter(offset):
                value = 0.0

            increment = rate_per_minute * (self.step / 60)
            noise = self.rng.uniform(1 - noise_pct, 1 + noise_pct)
            value += increment * noise

            yield value

    def spike_pattern(
        self,
        base: float,
        spike_factor: float = 10.0,
        spike_interval_minutes: int = 60,
    ) -> Generator[float, None, None]:
        for i, ts in enumerate(self._timestamps()):
            offset = self._offset_from_start(ts)

            # deterministic spike
            multiplier = self.anomalies.get_spike_multiplier(offset)
            if multiplier > 1.0:
                value = base * multiplier
            # periodic spike
            elif i > 0 and i % spike_interval_minutes == 0:
                value = base * spike_factor
            else:
                noise = self.rng.uniform(-0.1, 0.1) * base
                value = base + noise

            yield value

    def gauge_with_zero_drops(
        self,
        base: float,
        noise_pct: float = 0.1,
    ) -> Generator[float, None, None]:
        for ts in self._timestamps():
            offset = self._offset_from_start(ts)

            if self.anomalies.should_be_zero(offset):
                yield 0.0
            else:
                noise = self.rng.uniform(-noise_pct, noise_pct) * base
                yield max(0, base + noise)

    def latency_distribution(
        self, p50_ms: float, p99_ms: float
    ) -> Generator[List[float], None, None]:
        # see otel defaults (in ms)
        # https://opentelemetry.io/docs/specs/otel/metrics/sdk/#explicit-bucket-histogram-aggregation
        buckets = [5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 7500, 10000]

        for _ in range(self.num_points):
            # log-normal distribution
            sigma = math.log(p99_ms / p50_ms) / 2.33  # z-score for 99th percentile
            mu = math.log(p50_ms)

            # observations for each bucket
            counts = []
            total_requests = self.rng.randint(100, 1000)

            for i, bucket in enumerate(buckets):
                # CDF
                if bucket <= 0:
                    prob = 0
                else:
                    z = (math.log(bucket) - mu) / sigma
                    prob = 0.5 * (1 + math.erf(z / math.sqrt(2)))

                if i == 0:
                    count = int(prob * total_requests)
                else:
                    prev_bucket = buckets[i - 1]
                    z_prev = (math.log(prev_bucket) - mu) / sigma
                    prob_prev = 0.5 * (1 + math.erf(z_prev / math.sqrt(2)))
                    count = int((prob - prob_prev) * total_requests)

                counts.append(max(0, count))

            yield counts

    def generate_gauge_metrics(
        self,
        metric_name: str = "system.cpu.utilization",
        services: List[str] = None,
        hosts: List[str] = None,
    ) -> List[Metrics]:
        if services is None:
            services = ["frontend", "backend", "worker", "database"]
        if hosts is None:
            hosts = ["host-1", "host-2", "host-3", "host-4", "host-5"]

        metrics = []
        for service in services:
            for host in hosts:
                # diurnal pattern for CPU utilization (as a pct, we could have done state based counter metric as well)
                values = list[float](self.diurnal_pattern(20.0, 80.0))
                labels = {"service_name": service, "host": host}

                for i, ts in enumerate[datetime](self._timestamps()):
                    offset = self._offset_from_start(ts)

                    # inject gaps
                    if self.anomalies.is_in_gap(offset):
                        continue

                    if i < len(values):
                        metrics.append(
                            Metrics(
                                metric_name=metric_name,
                                labels=labels,
                                timestamp=ts,
                                value=values[i],
                                temporality="Unspecified",
                                type_="Gauge",
                                is_monotonic=False,
                            )
                        )

        return metrics

    def generate_cumulative_counter_metrics(
        self,
        metric_name: str = "http.server.request.count",
        services: List[str] = None,
        endpoints: List[str] = None,
        status_codes: List[str] = None,
    ) -> List[Metrics]:
        if services is None:
            services = ["api", "web", "auth"]
        if endpoints is None:
            endpoints = [
                "/api/v1/users",
                "/api/v1/orders",
                "/api/v1/products",
                "/health",
                "/metrics",
            ]
        if status_codes is None:
            status_codes = ["200", "500"]

        metrics = []
        for service in services:
            for endpoint in endpoints:
                for status_code in status_codes:
                    # rate varies by status code
                    base_rate = 100.0 if status_code == "200" else 5.0
                    values = list(self.monotonic_increasing(base_rate, 0.1))
                    labels = {
                        "service_name": service,
                        "endpoint": endpoint,
                        "status_code": status_code,
                    }

                    for i, ts in enumerate[datetime](self._timestamps()):
                        offset = self._offset_from_start(ts)

                        # inject artificial gaps
                        if self.anomalies.is_in_gap(offset):
                            continue

                        if i < len(values):
                            metrics.append(
                                Metrics(
                                    metric_name=metric_name,
                                    labels=labels,
                                    timestamp=ts,
                                    value=values[i],
                                    temporality="Cumulative",
                                    type_="Sum",
                                    is_monotonic=True,
                                )
                            )

        return metrics

    def generate_delta_counter_metrics(
        self,
        metric_name: str = "http.server.request.delta",
        services: List[str] = None,
        endpoints: List[str] = None,
        status_codes: List[str] = None,
    ) -> List[Metrics]:
        if services is None:
            services = ["api", "web", "auth"]
        if endpoints is None:
            endpoints = [
                "/api/v1/users",
                "/api/v1/orders",
                "/api/v1/products",
                "/health",
                "/metrics",
            ]
        if status_codes is None:
            status_codes = ["200", "500"]

        metrics = []
        for service in services:
            for endpoint in endpoints:
                for status_code in status_codes:
                    base_count = 100.0 if status_code == "200" else 5.0
                    labels = {
                        "service_name": service,
                        "endpoint": endpoint,
                        "status_code": status_code,
                    }

                    for ts in self._timestamps():
                        offset = self._offset_from_start(ts)

                        if self.anomalies.is_in_gap(offset):
                            continue

                        multiplier = self.anomalies.get_spike_multiplier(offset)
                        noise = self.rng.uniform(0.8, 1.2)
                        value = base_count * multiplier * noise

                        metrics.append(
                            Metrics(
                                metric_name=metric_name,
                                labels=labels,
                                timestamp=ts,
                                value=value,
                                temporality="Delta",
                                type_="Sum",
                                is_monotonic=True,
                            )
                        )

        return metrics

    def generate_connection_gauge_metrics(
        self,
        metric_name: str = "db.client.connections",
        services: List[str] = None,
        pool_names: List[str] = None,
    ) -> List[Metrics]:
        if services is None:
            services = ["backend", "worker"]
        if pool_names is None:
            pool_names = ["primary", "replica"]

        metrics = []
        for service in services:
            for pool in pool_names:
                base = 20.0 if pool == "primary" else 10.0
                values = list[float](self.gauge_with_zero_drops(base, 0.2))
                labels = {"service_name": service, "pool": pool}

                for i, ts in enumerate[datetime](self._timestamps()):
                    offset = self._offset_from_start(ts)

                    if self.anomalies.is_in_gap(offset):
                        continue

                    if i < len(values):
                        metrics.append(
                            Metrics(
                                metric_name=metric_name,
                                labels=labels,
                                timestamp=ts,
                                value=values[i],
                                temporality="Unspecified",
                                type_="Gauge",
                                is_monotonic=False,
                            )
                        )

        return metrics

    def generate_gc_duration_metrics(
        self,
        metric_name: str = "process.runtime.gc.duration",
        services: List[str] = None,
    ) -> List[Metrics]:
        if services is None:
            services = ["frontend", "backend", "worker", "api"]

        metrics = []
        for service in services:
            values = list[float](
                self.spike_pattern(5.0, 10.0, 30)
            )  # bump every 30 minutes (to similate real pattern)
            labels = {"service_name": service}

            for i, ts in enumerate[datetime](self._timestamps()):
                offset = self._offset_from_start(ts)

                if self.anomalies.is_in_gap(offset):
                    continue

                if i < len(values):
                    metrics.append(
                        Metrics(
                            metric_name=metric_name,
                            labels=labels,
                            timestamp=ts,
                            value=values[i],
                            temporality="Unspecified",
                            type_="Gauge",
                            is_monotonic=False,
                        )
                    )

        return metrics

    def generate_all_metrics(self) -> Dict[str, List[Metrics]]:
        return {
            "gauge": self.generate_gauge_metrics(),
            "cumulative_counter": self.generate_cumulative_counter_metrics(),
            "delta_counter": self.generate_delta_counter_metrics(),
            "connection_gauge": self.generate_connection_gauge_metrics(),
            "gc_duration": self.generate_gc_duration_metrics(),
        }

    def generate_flat_metrics(self) -> List[Metrics]:
        all_metrics = []
        for metrics_list in self.generate_all_metrics().values():
            all_metrics.extend(metrics_list)
        return all_metrics


def create_test_data_generator(
    duration_hours: int = 48,
    step_seconds: int = 60,
    seed: int = 42,
) -> MetricsDataGenerator:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start = now - timedelta(hours=duration_hours)
    return MetricsDataGenerator(
        start_time=start,
        end_time=now,
        step_seconds=step_seconds,
        seed=seed,
    )


def generate_simple_gauge_series(
    metric_name: str,
    labels: Dict[str, str],
    values: List[float],
    start_time: Optional[datetime] = None,
    step_seconds: int = 60,
) -> List[Metrics]:
    if start_time is None:
        start_time = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    metrics = []
    for i, value in enumerate(values):
        ts = start_time + timedelta(seconds=i * step_seconds)
        metrics.append(
            Metrics(
                metric_name=metric_name,
                labels=labels,
                timestamp=ts,
                value=value,
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
            )
        )
    return metrics


def generate_simple_counter_series(
    metric_name: str,
    labels: Dict[str, str],
    values: List[float],
    temporality: str = "Cumulative",
    start_time: Optional[datetime] = None,
    step_seconds: int = 60,
) -> List[Metrics]:
    if start_time is None:
        start_time = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    metrics = []
    for i, value in enumerate(values):
        ts = start_time + timedelta(seconds=i * step_seconds)
        metrics.append(
            Metrics(
                metric_name=metric_name,
                labels=labels,
                timestamp=ts,
                value=value,
                temporality=temporality,
                type_="Sum",
                is_monotonic=True,
            )
        )
    return metrics


def generate_non_monotonic_sum_series(
    metric_name: str,
    labels: Dict[str, str],
    values: List[float],
    temporality: str = "Cumulative",
    start_time: Optional[datetime] = None,
    step_seconds: int = 60,
) -> List[Metrics]:
    if start_time is None:
        start_time = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    metrics = []
    for i, value in enumerate(values):
        ts = start_time + timedelta(seconds=i * step_seconds)
        metrics.append(
            Metrics(
                metric_name=metric_name,
                labels=labels,
                timestamp=ts,
                value=value,
                temporality=temporality,
                type_="Sum",
                is_monotonic=False,  # non-monotonic sums are gauges for us
            )
        )
    return metrics


def generate_counter_with_resets(
    metric_name: str,
    labels: Dict[str, str],
    num_points: int,
    rate_per_point: float,
    reset_at_indices: List[int],
    start_time: Optional[datetime] = None,
    step_seconds: int = 60,
) -> List[Metrics]:
    if start_time is None:
        start_time = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    metrics = []
    value = 0.0
    for i in range(num_points):
        if i in reset_at_indices:
            value = 0.0
        else:
            value += rate_per_point

        ts = start_time + timedelta(seconds=i * step_seconds)
        metrics.append(
            Metrics(
                metric_name=metric_name,
                labels=labels,
                timestamp=ts,
                value=value,
                temporality="Cumulative",
                type_="Sum",
                is_monotonic=True,
            )
        )
    return metrics


def generate_sparse_series(
    metric_name: str,
    labels: Dict[str, str],
    values_at_indices: Dict[int, float],
    total_points: int,
    temporality: str = "Unspecified",
    type_: str = "Gauge",
    start_time: Optional[datetime] = None,
    step_seconds: int = 60,
) -> List[Metrics]:
    if start_time is None:
        start_time = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    metrics = []
    for i, value in values_at_indices.items():
        if i < total_points:
            ts = start_time + timedelta(seconds=i * step_seconds)
            metrics.append(
                Metrics(
                    metric_name=metric_name,
                    labels=labels,
                    timestamp=ts,
                    value=value,
                    temporality=temporality,
                    type_=type_,
                    is_monotonic=type_ == "Sum",
                )
            )
    return metrics
