FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
RUN NODE_NO_WARNINGS=1 node --experimental-vm-modules src/check-modules.mjs
ENV NODE_ENV=production DATA_DIR=/data PORT=8099 HOST=0.0.0.0
EXPOSE 8099
CMD ["node", "src/server.mjs"]
