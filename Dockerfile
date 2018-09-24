FROM node:latest

RUN mkdir /fs
WORKDIR /fs
COPY package*.json ./

RUN npm install
COPY . .

EXPOSE 7000
ENTRYPOINT [ "/fs/run.sh" ]