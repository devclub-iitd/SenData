FROM node:9

RUN mkdir /fs
WORKDIR /fs

COPY . .
RUN npm install

EXPOSE 7000
ENTRYPOINT["run.sh"]
