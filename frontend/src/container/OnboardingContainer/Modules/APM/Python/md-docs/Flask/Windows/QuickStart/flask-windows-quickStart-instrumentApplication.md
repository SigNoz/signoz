#### Requirements
- Python 3.8 or newer

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

&nbsp;

**Note:**
- Please make sure that you have installed all the dependencies of your application before running the command in **Step 3**. The command will not install instrumentation for the dependencies which are not installed.

