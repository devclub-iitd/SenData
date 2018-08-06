FROM node:9

RUN mkdir /usr/src/fs
WORKDIR /usr/src/fs

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 7000
CMD [ "npm", "start" ]