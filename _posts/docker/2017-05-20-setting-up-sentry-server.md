---
layout:     post
title:      "Setting up Sentry Server"
date:       2017-05-19
comments: true
author:     "Janshair Khan"
color: "#F32C25"
---

Sentry is an open-source real-time error and log tracking software. Sentry shows you application bugs and exceptions when they occur in real-time. It helps you to prioritize and identify fixes as soon as they occur.

To use Sentry, we either have to go to Sentry's [Website](https://sentry.io/welcome/), sign-up and go along with the managed Sentry with a paid plan. The other option is to download the Sentry and setup at your own servers. In this post, we will see how to setup Sentry in docker containers on your own infrastructure.

## Setting up Sentry Server with Docker Containers

Sentry needs the following services in order to run:

- **PostgreSQL** for data storage
- **Redis** for Caching
- **Sentry Server** itself
- **Sentry Cron** and **Sentry Worker**

Sentry Cron, Sentry Worker and Sentry Server has the **same** Docker image. We need separate images for Redis and PostgreSQL which are officially available at Docker hub. So, in a nutshell, there will be 5 Docker containers backing the  entire Sentry Server.

I already created a <a href="https://gist.github.com/kjanshair/ab8150a16ba726cc4213ba71cc9b3366" class="underline" target="blank">`docker-compose-sentry.yml`</a> to quickly up Sentry with Docker containers.

> If you want to setup Sentry Server with your own configurations and plugins, you can build your own custom Sentry image by setting the latest Sentry Docker image as the base image and add Configurations\Requirements files to the new image via your custom Dockerfile. See the [official sentry docker repository](https://github.com/getsentry/onpremise) as the example.

In this file, you need to add the *Secret Key*. Run the command to generate the key:

```bash
docker run --rm sentry config generate-secret-key
```

A Secret Key will be printed on the standard output screen, copy this and paste it as the value for *SENTRY_SECRET_KEY* Environment variable for all Sentry Services in the provided docker-compose file.

Change the SMTP settings, PostgreSQL database volume mount if required and run the compose command with:

```bash
docker-compose -f docker-compose-sentry.yml up -d
```

This will do 2 things:

- Setup a Docker network
- Run all the containers (Sentry Cron, Sentry Worker, Sentry Server, Redis and PostgreSQL) in the network

Containers will be able to interact with each other in the network via service discovery.

If you are running the Sentry for the very first time, you have to **upgrade** your PostgreSQL database for seeding. For this, get the container with `docker container ps` and create a session into any of the Sentry containers with the command:

```bash
docker container exec -it [containerid] /bin/bash
```

In my case:

```bash
docker container exec -it sentry /bin/bash
```

And run:

```bash
sentry upgrade
```

It will start creating the database schema required by Sentry to be setup successfully.

It will ask you to add a super user account by entering the email and the password. When done, `exit` from the container session, shutdown the services with `docker-compose -f docker-compose-sentry.yml down` and restart them with `docker-compose -f docker-compose-sentry.yml up -d`. Make sure that the all the 5 containers are up and running with the `docker-compose -f docker-compose-sentry.yml ps`.

Visit localhost or the DNS\IP of the machine (if you are on a remote server) on port 9000 and you will see the Sentry Server up and running.

{% if jekyll.environment == "production" %}    
    {% if page.comments %}
         {% include disqus.html %}
    {% endif %}
{% endif %}