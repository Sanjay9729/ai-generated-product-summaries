FROM node:20

EXPOSE 3000

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install && npm cache clean --force

COPY . .

# Build the React Router app
RUN npm run build

RUN npm prune --omit=dev

ENV NODE_ENV=production

# Start the server
CMD ["node", "server.js"]
