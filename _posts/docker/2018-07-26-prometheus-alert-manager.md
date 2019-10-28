---
layout:     post
title:      "Understanding Prometheus AlertManager"
date:       2018-07-26
comments: true
author:     "Janshair Khan"
color: "#E6522C"
---

Continuing the <a href="https://kjanshair.github.io/2018/02/20/prometheus-monitoring/" class="underline" target="_blank">previous</a> blog post on Prometheus, we will cover the alerting part which is an important component in the Prometheus infrastructure monitoring stack. We'll see **Prometheus AlertManager** and its integration with Prometheus Server in action.

## Understanding AlertManager and Prometheus Server

AlertManager is a Go binary and a separate component that comes with Prometheus. AlertManager, as a component, receives alerts from *Clients* and follow appropriate steps for firing alert notifications. Prometheus is one of the primary *Client* for AlertManager.

We defined AlertManager's configuration in Prometheus `prometheus.yml` configuration file by providing the host and port of the AlertManager. Once Prometheus knows about the AlertManager is, we define **conditions** in the same Prometheus configuration file based on which Prometheus should ask AlertManager to fire an alert to appropriate targets. If a certain condition doesn't the expectations in Prometheus, Prometheus will ask AlertManager to fire an alert (matching the condition) by forwarding to the AlertManager and finally AlertManager is responsible to decide what to do with those received alerts. AlertManager's conditions are defined in a rule file called `alert.rules`. Alert rules are configured in the Prometheus configuration `prometheus.yml` file.

In the below image, I showed visually that how a Prometheus and  the AlertManager are interacting with an Exporter (BlackBox Exporter in this case), a notification client and an HTTP Web server.

<img src="https://kjanshair.azureedge.net/docker/prometheus-alert-manager/1.png" alt="prom-am-1" class="img-responsive center-block"/>

In this post, we will see Prometheus, AlertManager, BlackBox Exporter, 2 HTTP servers and a notification client as vehicles to understand how the monitoring stack works in practice. We will be monitoring the status of an Apache HTTP server and an NGINX Web server. All of the components will be running in Docker containers.

<img src="https://kjanshair.azureedge.net/docker/prometheus-alert-manager/2.png" alt="prom-am-2" class="img-responsive center-block"/>

Prometheus BlackBox Exporter will probe for the health status check on NGINX and Apache over HTTP with a constant time-interval. Prometheus Server will check the health status of NGINX and Apache via the BlackBox Exporter. If any of the service goes down or stops responding, HTTP probe will fail in BlackBox Exporter and Prometheus Server will fire alerts based on the rules defined in the `alert.rules` file and based on the service which stopped responding i.e. if Apache HTTP service is down, notify to Team 1 via the **email-1** and vice versa. Below is the image shows the flow:

<img src="https://kjanshair.azureedge.net/docker/prometheus-alert-manager/3.png" alt="prom-am-3" class="img-responsive center-block"/>

<img src="https://kjanshair.azureedge.net/docker/prometheus-alert-manager/4.png" alt="prom-am-4" class="img-responsive center-block"/>

> You can find the source code <a href="https://github.com/kjanshair/docker-prometheus" class="underline" target="_blank">here</a>.

## Configuring Prometheus for AlertManager

First we need to tell Prometheus Server where it should for AlertManager. We do this by editing Prometheus configuration `prometheus.yml` file as:

```yaml
...
...
# Alertmanager configuration
alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - alertmanager:9093   # host:part
...
...
```

It is important to note that we are providing the *Docker container name* here, instead of `localhost`, where the AlertManager is running. Prometheus Server container will discover the AlertManager container via Docker embedded DNS. There is a official <a href="https://hub.docker.com/r/prom/alertmanager/" class="underline" target="_blank">Docker Image</a> for AlertManager that you can pull from Docker Hub and use.

> If you are directly using AlertManager Go binary, you should use `localhost` instead of `alertmanager` as host in the Prometheus configuration.

Next, we need to tell Prometheus Server about the use of BlackBox Exporter to probe Apache and NGINX containers over HTTP. We do this by adding:-

```yaml
  - job_name: 'httpd'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
        - http://httpd:80
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox:9115

  - job_name: 'nginx'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
        - http://nginx:80
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox:9115
```
In the Prometheus configuration file, we can see here that the host name for BlackExporter (At the bottom of each job name) and the host names for Apache and NGINX server are name of the containers where they are running. These services would be dynamically discovered by containers via Docker embedded DNS. You can find and change these container names in the `docker-compose.yml` file of the <a href="https://github.com/kjanshair/docker-prometheus/blob/master/docker-compose.yml" class="underline" target="_blank">repository</a>. The NGINX, Apache and BlackBox Exporter services are part of the `docker-compose.yml` file.

Next we need to tell the *Alerting Rules* to Prometheus Server upon which Prometheus will fire alerts. We do this by adding a `alert.rules` file that we also need to configure in the Prometheus Server. The file contains the following content:

```yaml
groups:

- name: httpd
  rules:
  - alert: httpd_down
    expr: probe_success{instance="http://httpd:80",job="httpd"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "httpd is down"

- name: nginx
  rules:
  - alert: nginx_down
    expr: probe_success{instance="http://nginx:80",job="nginx"} == 0
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "nginx is down"
```

In the above alert condition configurations, we are telling Prometheus Server to evaluate alert conditions for `httpd` and `nginx` services via a PromQL expression in the file. We write the expression as the value of `expr` in the `alert.rules` file. You can run this PromQL expression in Prometheus Server as well to check the status of a service. The PromQL expression will return **0** if a service is down and **1** if up. The section `probe*` is part of the BlackBox Exporter so you have to make sure that the BlackBox Exporter is running and is reachable from Prometheus Server in order to evaluate the expression correctly.

Prometheus Server will evaluate these expressions defined in the rule file and *if metric value evaluated from expression meets the condition* i.e. `probe_success{instance="http://nginx:80",job="nginx"}` is equal to `0` (service is down), Prometheus Server will wait for `1m` and if the expression meets the condition for 1m, now Prometheus Server has to fire alert and forward to AlertManager. Until now, Prometheus knows how to connect to AlertManager and when to fire and forward alerts to AlertManager, let's finally setup and configure the AlertManager.

## Setting up and configuring AlertManager

Now Prometheus got a service down and it has to notify someone (Since Prometheus Server is not responsible for alerting). In this case, Prometheus Server will fire an alert and forward to AlertManager. AlertManager got the alert and now its the responsibility of AlertManager where to route this alert. AlertManager is also responsible for a couple of use cases, for example, what if Prometheus is monitoring dozens of hundreds of services and half of them suddenly gone down and Prometheus fired and forwarded the alerts of each service to AlertManager, how AlertManager will decide how to manage and group these alerts rather than releasing hundreds of emails to OPS team? We do this in AlertManager YAML Configuration file.

In our example, the AlertManager file is inside the folder `alertmanager` by the name `config.yml`. The contents of the YAML file looks something like this:

```yaml
route:
  repeat_interval: 2h
  receiver: email-1
  routes:
    - match:
        alertname: httpd_down
      receiver: email-1

    - match:
        alertname: nginx_down
      receiver: email-2

receivers:
- name: email-1
  email_configs:
  - to: <to-email>
    from: <from-email>
    smarthost: <smtp:port>
    auth_username: "<user-name>"
    auth_identity: "<user-name>"
    auth_password: "<user-app-specific-password>"

- name: email-2
  email_configs:
  - to: <to-email>
    from: <from-email>
    smarthost: <smtp:port>
    auth_username: "<user-name>"
    auth_identity: "<user-name>"
    auth_password: "<user-app-specific-password>"
```

In this configuration, when AlertManager receives an alert, it makes the alert to follow a route in order to reach to a notification client via a `receiver`. Each route has to reach to a receiver which is a notification configuration for a particular shared communication channel (i.e. Slack, MS Teams, Email etc). These routes and receivers are defined in the AlertManager configuration file by the parent element called `route`. The parent `route` element has child `routes` which an alert follows in order to reach to its receiver based upon the match label as we will see in a bit. The AlertManager configuration is passed to the AlertManager with the `--config.file` flag as defined in the `docker-compose` file.

In the above configuration file, we are telling the AlertManager that if you receive an alert with a name (`httpd_down` for example), you should route the alert to appropriate receiver. For example, if an alert with the name `httpd_down` enters inside the AlertManager, AlertManager will match the label `alertname` with the alert that it received from Prometheus Server, see `alert.rules` file. If a match found, it will forward the alert to appropriate receiver for sending a notification and if doesn't find any route, it will use the default top-level parent `receiver` (`email-1` in this case).

That's all we have to configure for Prometheus alerting. Now try to run containers with `docker-compose up -d` command and try to manually stop NGINX or Apache HTTP container. When stopped, BlackExporter HTTP probe fails and an alert will be fired by Prometheus Server. You can check the active and firing alerts in the **Alerts** tab of the Prometheus Server Dashboard and in the AlertManager UI console running on port 9093. 

## Conclusion

AlertManager can do a lot with the alert that it receives from a client such as Prometheus Server. It can group alerts which helps you avoid dozens of notifications if dozens of services went down in a cluster for a certain number of time. AlertManager can mute notifications as well if you don't care about notifications about certain services. You can learn more about AlertManager and its configuration on the <a href="https://prometheus.io/docs/alerting/alertmanager/" class="underline" target="_blank">documentations</a>.


{% if jekyll.environment == "production" %}    
    {% if page.comments %}
         {% include disqus.html %}
    {% endif %}
{% endif %}