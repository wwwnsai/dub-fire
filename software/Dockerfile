FROM node:20-alpine

WORKDIR /app

COPY software/package*.json ./
RUN npm ci

COPY software ./

ENV NODE_ENV=production
ENV PORT=3000

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
