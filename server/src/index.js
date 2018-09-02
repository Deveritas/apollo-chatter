import 'dotenv/config';

import { ApolloServer, AuthenticationError, } from 'apollo-server-express';
import cors from 'cors';
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';

import typeDefs from './schema';
import resolvers from './resolvers';
import models, { sequelize } from './models';
import loaders from './loaders'

import { createUsersWithMessages } from './tests/testData';

const getMe = async req => {
  const token = req.headers['x-token'];

  if (token) {
    try {
      return await jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      throw new AuthenticationError('Your session expired. Sign in again.');
    }
  }
};

let context = async ({ req, connection }) => {
  if (connection) {
    return { models };
  }

  if (req) {
    return {
      models,
      me: await getMe(req),
      secret: process.env.JWT_SECRET,
      loaders: {
        user: loaders.user.batchUsers(models)
      },
    };
  }
};

let formatError = error => ({
  ...error,
  message: error.message
  .replace('SequelizeValidationError: ', '')
  .replace('Validation error: ', ''),
});

const isTest = !!process.env.TEST_DATABASE;
const isProduction = !!process.env.DATABASE_URL;
const port = process.env.PORT || 8000;
const forcePlayground = !isProduction || process.env.FORCE_HEROKU_GRAPHQL_PLAYGROUND;
const force = isTest || (isProduction && process.env.FORCE_HEROKU_PG_RESET);

const app = express();
app.use(cors());

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError,
  context,
  introspection: forcePlayground,
  playground: forcePlayground
});
server.applyMiddleware({ app, path: '/graphql' });

const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

sequelize.sync({ force }).then(async () => {
  if (force) {
    await createUsersWithMessages(models, new Date())
  }
  httpServer.listen({ port }, () => {
    console.log(`Apollo server on http://localhost:${port}${server.graphqlPath}`);
  });
});
