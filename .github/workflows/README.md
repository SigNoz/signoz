To run GitHub workflow, a few environment variables needs to add in GitHub secrets

####  Environment Variables

<table>
  <tr>
    <th> Variables </th>
    <th> Description </th>
    <th> Example </th>
  </tr>
  <tr>
    <td> REPONAME </td>
    <td> Provide the DockerHub user/organisation name of the image. </td>
    <td> signoz</td>
  </tr>
  <tr>
    <td> DOCKERHUB_USERNAME </td>
    <td> Docker hub username </td>
    <td> signoz</td>
  </tr>
  <tr>
    <td> DOCKERHUB_TOKEN </td>
    <td> Docker hub password/token with push permission </td>
    <td> **** </td>
  </tr>
  <tr>
    <td> SONAR_TOKEN </td>
    <td> <a href="https://sonarcloud.io">SonarCloud</a> token </td>
    <td> **** </td>
  </tr>
