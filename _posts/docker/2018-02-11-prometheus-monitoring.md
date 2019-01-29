---
layout:     post
date:       2018-02-20
isImage: true
imageUrl: https://kjanshair.azureedge.net/docker/prometheus-introduction/prometheus.png
comments: true
author: "Janshair Khan"
color: "#E6522C"
---

## Monitoring with Prometheus

Monitoring applications & application servers is an important part of the today's DevOps workflow which includes continuous monitoring of your applications and servers for application exceptions, server's CPU & memory usage or storage spikes. You would also like to get some type of notification if some CPU or memory spike occurs at a given time or a service of your application stops responding so you can perform appropriate actions against those failures or exceptions.

There are a number of monitoring tools out there such Amazon CloudWatch, Nagios, New Relic, Prometheus and others. Some are free & open-source and some are paid. Here, we will take a look at the **Prometheus** and how it is different. 

## What exactly Prometheus is and how it is different?

Prometheus is a popular CNCF project, free & open-source monitoring tool for monitoring dozens of services and is completely written in Golang. Some of its components are written in Ruby and other programming languages but most of the Prometheus components are written in Go. That means, you have a single binary executable, you download and run Prometheus as that simple. Prometheus is also fully Docker compatible. A number of Prometheus components with the Prometheus server itself are available on the Docker Hub that we are going to see here in action.

You will see how to spin-up a minimal Prometheus server with Node Exporter and Grafana components in Docker containers to monitor a stand-alone Linux Ubuntu 16.04 server. Let's take a look at what are the mandatory components in Prometheus from ground-up.

## Prometheus Components

### Prometheus Server

Prometheus has a main central component called **Prometheus Server**. As a monitoring service, Prometheus server ***Monitor particular thing***, that thing could be anything i.e. it could be a an entire Linux server, a stand-alone Apache server, a single process, it could be a database service or some other system unit that you want to monitor. In Prometheus terms, we call the main monitoring service as the *Prometheus Server* and the stuff that Prometheus monitors are called *Targets*. Hence Prometheus server monitors Targets. As said before, Targets could be anything i.e. it could be a single server or a targets for probing of endpoints over HTTP, HTTPS, DNS, TCP and ICMP (Black-Box Exporter) or it could be a simple HTTP endpoint that an application exposes through which the Prometheus server get the application health status from.

Each unit of a target such as current CPU status, memory usage (In case of a Linux server Prometheus target) or any other specific unit that you would like to monitor is called **a metric**. So Prometheus server collects metrics from targets (over HTTP), stores them locally or remotely and displays them back in the Prometheus server.

Prometheus server **scrapes** targets at a given interval that you define to collect metrics from specific targets and store them in a ***time-series database***. You define the targets and the time-interval for scraping metrics in the `prometheus.yml` configuration file.

<img src="https://kjanshair.azureedge.net/docker/prometheus-introduction/1.png" alt="prometheus-app-api" class="img-responsive center-block"/>

You get the metrics details by querying from the Prometheus's time-series database where the Prometheus stores metrics and you use a query language called **PromQL** in the Prometheus server to query metrics about the targets. In other words, you ask the Prometheus server via PromQL to show us the status of a particular target at a given time.

Prometheus provides client-libraries in a number of languages that you can use to provide health-status of your application. But Prometheus is not only about application monitoring, you can use something called **Exporters** to monitor third-party systems  (Such as a Linux Server, MySQL daemon etc). An Exporter is a piece of software that gets existing metrics from a third-party system and export them to the metric format that the Prometheus server can understand. 

<img src="https://kjanshair.azureedge.net/docker/prometheus-introduction/2.png" alt="prometheus-app-exporters" class="img-responsive center-block"/>

A sample metric from a Prometheus server could be the current usage of free memory or file-system free via a Node Exporter in the Prometheus server.

> It is important to know that metrics that you get from a third-party system are different from the Prometheus metrics. Because Prometheus uses a standard data-model with a key-value based metrics that might not match with the third-party system this is why you use exporters to convert them. To keep things simple, I won't go into the details of each syntax of a Prometheus metrics and how they are different.

### Visualization Layer with Grafana

You use [Grafana](https://grafana.com/) the visualization layer as the 3rd component to visualize metrics stored in the Prometheus time-series database. Instead of writing PromQL queries directly into the Prometheus server, you use Grafana UI boards to query metrics from Prometheus server and visualize them in the Grafana Dashboard as a whole as we will see it in action shortly.

### Alert Management with Prometheus Alert Manager

Prometheus also has a Alert Management component called **AlertManager** for firing alerts via Email or Slack or other notification clients. You define the Alert Rules in a file called `alert.rules` through which the Prometheus server reads the alert configurations and fire alerts at appropriate times via the Alert Manager component. For example, if the Prometheus server finds the value of a metric greater than the threshold that you defined in the `alert.rules` file for more than 30 seconds, it will trigger the Alert Manager to fire an alert about the threshold and the metric. We will see how AlertManager works with Prometheus and how do we setup in the Prometheus stack in some later post.

The above 3 components are the basis of the entire Prometheus Monitoring system. You need the central Prometheus server, a target and a visualization layer. Lets see how to setup a minimal Prometheus stack with the above 3 components to monitor a simple Ubuntu 16.04 server using `docker-compose`.

## Setting Up Prometheus in Docker Containers

Its time to setup Prometheus stack on your Linux Server. You will setup Prometheus server for collecting metrics, Grafana for visualization and Node Exporter for monitoring the Ubuntu 16.04 Linux host system. You will use `docker-compose` to spin up services for Prometheus, Grafana and Node Exporter but let's first spin up a stand-alone Prometheus server service with the `docker-compose` file given below:

```yaml
version: '3'

networks:
  monitor-net:
    driver: bridge

volumes:
    prometheus_data: {}

services:

  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./prometheus/:/etc/prometheus/
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention=200h'
      - '--web.enable-lifecycle'
    # restart: unless-stopped
    expose:
      - 9090
    ports:
      - "9090:9090"
    networks:
      - monitor-net
```

The Prometheus `docker-compose` service use the official `prom/prometheus` image, save the Prometheus data (such as the Time-Series Data) into a named volume and gets Prometheus configuration YAML file from the host file-system which we defined above in the `command` section of the compose file. The `--storage.tsdb.retention=200h` flag is important as this will clear the TSDB every 15 days which is good for saving disk space. And you finally expose the service ports to the host from the container so you can access them over the Internet.

This compose file will spin up the Prometheus Server with no Exporter or application. With the stand-alone Prometheus Server running inside the Docker container, you can monitor the Prometheus server itself because it also scrapes the Prometheus server as defined in the `prometheus.yml` file. For example, you can see how many alerts were failed since the Prometheus server is up and running and other type of metrics about the Prometheus. Now let's add Node Exporter service in the above defined compose file.

### Adding the Node Exporter

The next thing, you should do is to spin-up the **Node Exporter** container and attach it to the Prometheus server as shown in the below YAML file:

```yaml
version: '3'

networks:
  monitor-net:
    driver: bridge

volumes:
    prometheus_data: {}

services:

  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./prometheus/:/etc/prometheus/
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention=200h'
      - '--web.enable-lifecycle'
    # restart: unless-stopped
    expose:
      - 9090
    ports:
      - "9090:9090"
    networks:
      - monitor-net

  nodeexporter:
    image: prom/node-exporter:latest
    container_name: nodeexporter
    user: root
    privileged: true
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'
    restart: unless-stopped
    expose:
      - 9100
    networks:
      - monitor-net
``` 

Here you added another `docker-compose` service called *nodexporter*. As mentioned earlier, an exporter is a piece of software that translates metrics from a third-party system to a metric format that Prometheus can understand. The Node Exporter exports hardware and OS metrics to the Prometheus server which gets and stores it in its time-series database. You mount the host system volumes and pass a couple of flags to the Node Exporter service to help discover information about the host system using **procfs** & **sysfs** mount points. *procfs* and *sysfs* are file-systems in Unix-like operating systems that shows information about processes and other system informations like storage, etc in a hierarchical file-like structure and directories. This structure varies from distro to distro. You mount these host directories as volumes to the Node Exporter service so the Node Exporter can see the host's system information and you pass some command-line flags with the value of the locations of these directories to the Node Exporter container.

If you run Prometheus server, you should now see or execute the PromQL queries with the ***node_*** prefix in the Prometheus server. Running these PromQL queries in Prometheus will show you some info about the host system processes, storage and other metrics.

### Adding visualization with Grafana

Grafana is a Data visualization & Monitoring tool with support for a number of databases including Prometheus TSDB. With Grafana,you can create some fancy graphical UI for metrics that you collect from Prometheus server as shown below:

<img src="https://kjanshair.azureedge.net/docker/prometheus-introduction/3.png" alt="grafana-dashboard" class="img-responsive center-block"/>

What happens here though is you write PromQL queries in Grafana Dashboard items instead of writing in the Prometheus server, Grafana pull those metrics from the Prometheus server at an  interval that you choose at the top-right corner of the Grafana Dashboard and displays them graphically in its Dashboard. Grafana itself runs in the Docker container so add the Grafana service and our final `docker-compose` file looks like:

```yaml
version: '3'

networks:
  monitor-net:
    driver: bridge

volumes:
    prometheus_data: {}
    grafana_data: {}

services:

  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./prometheus/:/etc/prometheus/
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention=200h'
      - '--web.enable-lifecycle'
    # restart: unless-stopped
    expose:
      - 9090
    ports:
      - "9090:9090"
    networks:
      - monitor-net
  
  nodeexporter:
    image: prom/node-exporter:latest
    container_name: nodeexporter
    user: root
    privileged: true
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'
    restart: unless-stopped
    expose:
      - 9100
    networks:
      - monitor-net

  grafana:
   image: grafana/grafana:latest
   container_name: grafana
   volumes:
     - grafana_data:/var/lib/grafana
     - ./grafana/datasources:/etc/grafana/datasources
     - ./grafana/dashboards:/etc/grafana/dashboards
     - ./grafana/setup.sh:/setup.sh
   entrypoint: /setup.sh
   environment:
     - GF_SECURITY_ADMIN_USER=${ADMIN_USER:-admin}
     - GF_SECURITY_ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin}
     - GF_USERS_ALLOW_SIGN_UP=false
   restart: unless-stopped
   expose:
     - 3000
   ports:
     - 3000:3000
   networks:
     - monitor-net

```

Copy the above `docker-compose` file contents and run `docker-compose up -d` to spin-up Prometheus server, Node Exporter and Grafana containers and run `docker-compose ps` to check the statuses of the containers. Here you are also mounting the host directory file-system to the Grafana service, so it can access the Dashboard's JSON from the host system.

Now finally go to your system's public IP address with the port `3000` and enter `admin:admin` user name and password to see your server stats in the Grafana Dashboard. You will see something like shown below:

<img src="https://kjanshair.azureedge.net/docker/prometheus-introduction/3.png" alt="grafana-dashboard" class="img-responsive center-block"/>

## Conclusion

Here you saw a simplest example of how to setup a Prometheus server with Node Exporter and Grafana to visualize our Ubuntu 16.04 Linux server stats. You can store Prometheus time-series data to a 3rd party storage such as **InfluxDB** rather than the local file-system. It's important to note that Prometheus is not about logging and tracing. We will see how to add Prometheus Alert Manager component to the above Prometheus stack to send Email or Slack alerts if something goes wrong and how to use service discovery with Prometheus.

You can find the complete source code for the post <a href="https://github.com/kjanshair/docker-prometheus" class="underline" target="_blank">here</a>. Read the Prometheus <a href="https://prometheus.io/docs/" class="underline" target="_blank">documentation</a> to learn more about Prometheus components and its architecture.

{% if jekyll.environment == "production" %}    
    {% if page.comments %}
         {% include disqus.html %}
    {% endif %}
{% endif %}