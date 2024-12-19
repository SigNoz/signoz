Run your application<br></br>

```bash
java -javaagent:/opentelemetry-javaagent.jar -jar <myapp>.jar
```

&nbsp;


- `<myapp>` is the name of your application jar file
- In case you download `opentelemetry-javaagent.jar` file in different directory than that of the project, replace `$PWD` with the path of the otel jar file.
