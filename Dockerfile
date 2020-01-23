FROM node:latest
RUN mkdir -p /opt/whisperation/logs
COPY . /opt/whisperation

ENV LOG_FOLDER /opt/whisperation/logs
RUN mkdir -p /opt/logs

CMD ["node", "/opt/whisperation/whisperationserver.js"]