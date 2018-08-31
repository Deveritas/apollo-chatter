import jwt from 'jsonwebtoken';
import { combineResolvers } from 'graphql-resolvers';
import { UserInputError } from 'apollo-server'

import { isAdmin } from './authorization';

const createToken = async (user, secret, expiresIn) => {
  const { id, email, username, role } = user;
  return await  jwt.sign({ id, email, username, role }, secret, {
    expiresIn
  });
};

export default {
  Query: {
    me: async (parent, args, { models, me }) => {
      if (!me) {
        return null;
      }

      return await models.User.findById(me.id);
    },
    user: async (parent, { id }, { models }) => {
      return await models.User.findById(id);
    },
    users: async (parent, args, { models }) => {
      return await models.User.findAll();
    },
  },

  Mutation: {
    signUp: async (
      parent,
      { username, email, password },
      { models, secret },
    ) => {
      const user = await models.User.create({
        username,
        email,
        password,
      });

      return { token: createToken(user, secret, '30m') };
    },
    signIn: async (
      parent,
      { login, password },
      { models, secret },
    ) => {
      const user = await models.User.findByLogin(login);

      if (!(user && await user.validatePassword(password))) {
        throw new UserInputError(
          'No user found with this login credentials.',
        );
      }

      return { token: createToken(user, secret, '30m') };
    },
    deleteUser: combineResolvers(
      isAdmin,
      async (parent, { id }, { models }) => {
        return await models.User.destroy({
          where: { id }
        });
      },
    ),
  },

  User: {
    messages: async (user, args, { models }) => {
      return await models.Message.findAll({
        where: {
          userId: user.id,
        },
      });
    },
  },
}