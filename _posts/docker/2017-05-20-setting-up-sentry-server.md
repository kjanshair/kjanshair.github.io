---
layout:     post
title:      "Setting up Sentry Server"
date:       2017-05-19
comments: true
author:     "Janshair Khan"
color: "#F32C25"
---

## What is Sentry?

Sentry is an open-source real-time error and log tracking system. Sentry shows you every bug, crash, errors and exceptions when they occur in real-time. It also helps you to prioritize and identify fixes.

To use Sentry, we either have to go to Sentry's [Website](https://sentry.io/welcome/), sign-up and go along with Sentry with a paid plan. The other options, Sentry provides is to download Sentry and setup at your own servers.

Now to setup Sentry at your own servers, you either install Sentry with its dependency using Python or you can use Docker Containers. This is what we're going to see that how do we setup Sentry via Docker containers.

## Setting up Sentry Server with Docker Compose

Sentry usually needs the following services in order to run:

- PostgreSQL for data storage
- Redis for Caching
- Sentry Server
- Sentry Cron and Sentry Worker

Sentry Cron, Sentry Worker and Sentry Server itself has the same Docker image where we need separate images for Redis and PostgreSQL. We will use the official Docker images from the Docker Hub for provisioning Redis and PostgreSQL containers. So, in a nutshell, there will be 5 Docker containers backing the Sentry Server.

To make things easier, I already created a `docker-compose-sentry.yml` file that you can get from <a href="https://gist.github.com/kjanshair/ab8150a16ba726cc4213ba71cc9b3366" class="underline" target="blank">here</a> to up and running quickly with your on-premises Sentry Server with Docker containers. This file sets up all the services required to setup Sentry.

> If you want to setup Sentry with your own Configuration settings, plugins etc, you can build your own custom Sentry image by putting the latest Sentry image as the base image and add Configurations\Requirements files to the new image using your custom Dockerfile. See the [official sentry docker repository](https://github.com/getsentry/onpremise) as an example.

In this file, you first need to add the *Secret Key*. To get the *Secret Key*, run the command:

```bash
docker run --rm sentry config generate-secret-key
```

A Secret Key will be printed on the standard output screen, copy this and paste it as the value for *SENTRY_SECRET_KEY* Environment variable for all Sentry Services in the compose file.

Change the SMTP settings, PostgreSQL database volume mount, if required and run the compose command:

```bash
docker-compose -f docker-compose-sentry.yml up -d
```

This will do 3 core things:

- Setup a private Docker network
- Host our services into the private network
- Run Sentry Cron, Sentry Worker, Sentry Server, Redis and PostgreSQL Containers

Containers will be able to interact with each other in the private network due to service discovery feature built-in.

Now if you are running Sentry for the very first time, you have to **upgrade** your PostgreSQL database. To do this, type `docker container ps` and penetrate into any of the Sentry containers via ID with the command:

```bash
docker container exec -it [containerid] /bin/bash
```

In my case:

```bash
docker container exec -it 8651b0d86500 /bin/bash
```

And run the `sentry upgrade` command inside the container's console. It will start creating the database schema required by Sentry to be setup successfully.

It will ask you to add a super user account by entering email, password etc. When done, `exit` from the container, shutdown the services with `docker-compose -f docker-compose-sentry.yml down` command and restart them with `docker-compose -f docker-compose-sentry.yml up -d` and make sure that the all the 5 containers are up and running with the `docker-compose -f docker-compose-sentry.yml ps` command.

Go to the localhost or the DNS\IP of the machine (if you are on a remote server) on port 9000 and you will see the Sentry Server up and running.

{% if jekyll.environment == "production" %}    
    {% if page.comments %}
         {% include disqus.html %}
    {% endif %}
{% endif %}