FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip libreoffice-writer \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY requirements.txt ./
RUN pip3 install --break-system-packages --no-cache-dir -r requirements.txt

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PYTHON=python3
ENV PORT=5173

EXPOSE 5173

CMD ["npm", "start"]
