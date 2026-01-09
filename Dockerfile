FROM node:20

EXPOSE 3000

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install && npm cache clean --force

COPY . .

RUN npx prisma generate

RUN NODE_ENV=production npm run build

RUN npm prune --omit=dev

ENV NODE_ENV=production

# Start the Express server instead of react-router-serve
CMD ["node", "server.js"]
