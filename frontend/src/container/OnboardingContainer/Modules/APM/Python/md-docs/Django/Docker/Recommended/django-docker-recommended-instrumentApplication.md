&nbsp;

After setting up the Otel collector agent, follow the steps below to Dockerize your Python Application

#### Requirements
- Python 3.8 or newer
- for Django, you must define `DJANGO_SETTINGS_MODULE` correctly. If your project is called `mysite`, something like following should work:
```bash
export DJANGO_SETTINGS_MODULE=mysite.settings
```
&nbsp;


### Step 1 : Add OpenTelemetry dependencies

In your `requirements.txt` file, add these two OpenTelemetry dependencies:


```bash
opentelemetry-distro==0.43b0
opentelemetry-exporter-otlp==1.22.0

```

&nbsp;

### Step 2 : Dockerize your application

Update your Dockerfile along with OpenTelemetry instructions as shown below:

```bash
...

# Install any needed packages specified in requirements.txt
# And install OpenTelemetry packages
RUN pip install --no-cache-dir -r requirements.txt 

RUN opentelemetry-bootstrap --action=install

# (Optional) Make port 5000 available to the world outside this container (You can choose your own port for this)
EXPOSE 5000

# Set environment variables for OpenTelemetry
ENV OTEL_RESOURCE_ATTRIBUTES=service.name={{MYAPP}}
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
ENV OTEL_EXPORTER_OTLP_PROTOCOL=grpc

# Run app.py with OpenTelemetry instrumentation when the container launches
CMD ["opentelemetry-instrument", "<your_run_command>"]
...
```

- <your_run_command> can be `python3 app.py` or `python manage.py runserver --noreload`






