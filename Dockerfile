FROM node:20.11.0-alpine3.19
ADD --chown=node:node . /dydx-faucet
USER node:node
WORKDIR /dydx-faucet
RUN npm ci --loglevel=verbose \
    && npm run build
CMD npm run prod
