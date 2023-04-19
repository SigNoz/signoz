<p align="center">
  <img src="https://res.cloudinary.com/dcv3epinx/image/upload/v1618904450/signoz-images/LogoGithub_sigfbu.svg" alt="SigNoz-logo" width="240" />

  <p align="center">Monitore seus aplicativos e solucione problemas em seus aplicativos implantados, uma alternativa de código aberto para soluções como DataDog, New Relic, entre outras.</p>
</p>

<p align="center">
    <img alt="Downloads" src="https://img.shields.io/docker/pulls/signoz/frontend?label=Downloads"> </a>
    <img alt="GitHub issues" src="https://img.shields.io/github/issues/signoz/signoz"> </a>
    <a href="https://twitter.com/intent/tweet?text=Monitor%20your%20applications%20and%20troubleshoot%20problems%20with%20SigNoz,%20an%20open-source%20alternative%20to%20DataDog,%20NewRelic.&url=https://signoz.io/&via=SigNozHQ&hashtags=opensource,signoz,observability"> 
        <img alt="tweet" src="https://img.shields.io/twitter/url/http/shields.io.svg?style=social"> </a> 
</p>
  
  
<h3 align="center">
  <a href="https://signoz.io/docs"><b>Documentação</b></a> &bull;
  <a href="https://signoz.io/slack"><b>Comunidade no Slack</b></a> &bull;
  <a href="https://twitter.com/SigNozHq"><b>Twitter</b></a>
</h3>

##

SigNoz auxilia os desenvolvedores a monitorarem aplicativos e solucionar problemas em seus aplicativos implantados. SigNoz usa rastreamento distribuído para obter visibilidade em sua pilha de software. 

👉 Você pode verificar métricas como latência p99, taxas de erro em seus serviços, requisições às APIs externas e endpoints individuais.

👉 Você pode encontrar a causa raiz do problema acessando os rastreamentos exatos que estão causando o problema e verificar os quadros detalhados de cada requisição individual.

👉 Execute agregações em dados de rastreamento para obter métricas de negócios relevantes.


![SigNoz Feature](https://signoz-public.s3.us-east-2.amazonaws.com/signoz_hero_github.png)

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/Contributing.svg" width="50px" />

## Junte-se à nossa comunidade no Slack 

Venha dizer oi para nós no [Slack](https://signoz.io/slack) 👋

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/Features.svg" width="50px" />

## Funções:

- Métricas de visão geral do aplicativo, como RPS, latências de percentual 50/90/99 e taxa de erro
- Endpoints mais lentos em seu aplicativo
- Visualize o rastreamento preciso de requisições de rede para descobrir problemas em serviços downstream, consultas lentas de banco de dados, chamadas para serviços de terceiros, como gateways de pagamento, etc. 
- Filtre os rastreamentos por nome de serviço, operação, latência, erro, tags / anotações.
- Execute agregações em dados de rastreamento (eventos / extensões) para obter métricas de negócios relevantes, como por exemplo, você pode obter a taxa de erro e a latência do 99º percentil de `customer_type: gold` or `deployment_version: v2` or `external_call: paypal`
- Interface de Usuário unificada para métricas e rastreios. Não há necessidade de mudar de Prometheus para Jaeger para depurar problemas.

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/WhatsCool.svg" width="50px" />

## Por que escolher SigNoz?

Sendo desenvolvedores, achamos irritante contar com fornecedores de SaaS de código fechado para cada pequeno recurso que queríamos. Fornecedores de código fechado costumam surpreendê-lo com enormes contas no final do mês de uso sem qualquer transparência .

Queríamos fazer uma versão auto-hospedada e de código aberto de ferramentas como DataDog, NewRelic para empresas que têm preocupações com privacidade e segurança em ter dados de clientes indo para serviços de terceiros. 

Ser open source também oferece controle completo de sua configuração, amostragem e tempos de atividade. Você também pode construir módulos sobre o SigNoz para estender recursos específicos do negócio.

### Linguagens Suportadas:

Nós apoiamos a biblioteca [OpenTelemetry](https://opentelemetry.io) como a biblioteca que você pode usar para instrumentar seus aplicativos. Em outras palavras, SigNoz oferece suporte a qualquer framework e linguagem que suporte a biblioteca OpenTelemetry. As principais linguagens suportadas incluem: 

- Java
- Python
- NodeJS
- Go

Você pode encontrar a lista completa de linguagens aqui - https://opentelemetry.io/docs/

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/Philosophy.svg" width="50px" />

## Iniciando
  
  
### Implantar usando Docker

Siga as etapas listadas [aqui](https://signoz.io/docs/install/docker/) para instalar usando o Docker.

Esse [guia para solução de problemas](https://signoz.io/docs/install/troubleshooting/) pode ser útil se você enfrentar quaisquer problemas. 

<p>&nbsp  </p>
  
  
### Implentar no Kubernetes usando Helm

Siga as etapas listadas [aqui](https://signoz.io/docs/deployment/helm_chart) para instalar usando helm charts.
  

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/UseSigNoz.svg" width="50px" />

## Comparações com ferramentas similares 

### SigNoz ou Prometheus

Prometheus é bom se você quiser apenas fazer métricas. Mas se você quiser ter uma experiência perfeita entre métricas e rastreamentos, a experiência atual de unir Prometheus e Jaeger não é ótima.

Nosso objetivo é fornecer uma interface do usuário integrada entre métricas e rastreamentos - semelhante ao que fornecedores de SaaS como o Datadog fornecem - e fornecer filtragem e agregação avançada sobre rastreamentos, algo que a Jaeger atualmente carece. 

<p>&nbsp  </p>

### SigNoz ou Jaeger

Jaeger só faz rastreamento distribuído. SigNoz faz métricas e rastreia, e também temos gerenciamento de log em nossos planos.

Além disso, SigNoz tem alguns recursos mais avançados do que Jaeger:

- A interface de usuário do Jaegar não mostra nenhuma métrica em traces ou em traces filtrados
- Jaeger não pode obter agregados em rastros filtrados. Por exemplo, latência p99 de solicitações que possuem tag - customer_type='premium'. Isso pode ser feito facilmente com SigNoz.

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/Contributors.svg" width="50px" />

## Contribuindo


Nós ❤️ contribuições grandes ou pequenas. Leia [CONTRIBUTING.md](CONTRIBUTING.md) para começar a fazer contribuições para o SigNoz. 

Não sabe como começar? Basta enviar um sinal para nós no canal `#contributing` em nossa [comunidade no Slack.](https://signoz.io/slack)

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/DevelopingLocally.svg" width="50px" />

## Documentação

Você pode encontrar a documentação em https://signoz.io/docs/. Se você tiver alguma dúvida ou sentir falta de algo, sinta-se à vontade para criar uma issue com a tag `documentation` no GitHub ou entre em contato conosco no canal da comunidade no Slack.

<br /><br />

<img align="left" src="https://signoz-public.s3.us-east-2.amazonaws.com/Contributing.svg" width="50px" />

## Comunidade

Junte-se a [comunidade no Slack](https://signoz.io/slack) para saber mais sobre rastreamento distribuído, observabilidade ou SigNoz e para se conectar com outros usuários e colaboradores. 

Se você tiver alguma ideia, pergunta ou feedback, compartilhe em nosso [Github Discussões](https://github.com/SigNoz/signoz/discussions)

Como sempre, obrigado aos nossos incríveis colaboradores! 

<a href="https://github.com/signoz/signoz/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=signoz/signoz" />
</a>



