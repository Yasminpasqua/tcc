FROM node:22-alpine
WORKDIR /app

# Dependências do servidor
COPY servidor/package*.json servidor/
RUN cd servidor && npm ci --omit=dev

# Projeto inteiro (o servidor também entrega o site e o widget da pasta raiz)
COPY . .

ENV PORT=3100
EXPOSE 3100
CMD ["node", "servidor/server.js"]
