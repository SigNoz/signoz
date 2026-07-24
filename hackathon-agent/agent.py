import os
import time
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

# OpenTelemetry & OpenInference Imports
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from openinference.instrumentation.langchain import LangChainInstrumentor

# 1. Setup OpenTelemetry to send traces to SigNoz
def setup_telemetry():
    endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://127.0.0.1:4317")
    resource = Resource(attributes={"service.name": "hackathon-ai-agent"})
    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
    LangChainInstrumentor().instrument()
    print("Telemetry setup complete. Traces will be sent to SigNoz at", endpoint)

from langchain_core.language_models.llms import LLM
from typing import Any, List, Optional

class FakeLLM(LLM):
    def _call(self, prompt: str, stop: Optional[List[str]] = None, **kwargs: Any) -> str:
        return "Observability is understanding internal states from external outputs, crucial for debugging AI systems."
    
    @property
    def _llm_type(self) -> str:
        return "fake"

def run_agent():
    setup_telemetry()
    llm = FakeLLM()
    
    print("\n--- Starting Task 1 (Simple Generation) ---")
    response = llm.invoke("Explain observability in 15 words.")
    print("Final Response:", response)
    
    print("\nDone! Check SigNoz traces at http://localhost:3301")

if __name__ == "__main__":
    run_agent()
