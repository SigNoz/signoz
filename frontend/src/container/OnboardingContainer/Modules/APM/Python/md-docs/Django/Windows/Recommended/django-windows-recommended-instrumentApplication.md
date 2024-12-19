&nbsp;

After setting up the Otel collector agent, follow the steps below to instrument your Python Application

#### Requirements
- Python 3.8 or newer
- for Django, you must define `DJANGO_SETTINGS_MODULE` correctly. If your project is called `mysite`, something like following should work:
```bash
export DJANGO_SETTINGS_MODULE=mysite.settings
```
&nbsp;

### Step 1 : Create a virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```
This will create and activate a virtual environment named `.venv`

&nbsp;

### Step 2 : Install the OpenTelemetry dependencies

```bash
pip install opentelemetry-distro==0.38b0
pip install opentelemetry-exporter-otlp==1.17.0
```
&nbsp;

### Step 3 : Add automatic instrumentation

```bash
opentelemetry-bootstrap --action=install
```


