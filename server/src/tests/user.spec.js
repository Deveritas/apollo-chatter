import { expect } from 'chai';

import * as userApi from './api';

describe('User', () => {
  let userIdToDelete;

  describe('user(id: String!): User', () => {
    it('returns a user when user can be found', async () => {
      const expectedResult = {
        data: {
          user: {
            id: '1',
            username: 'Deveritas',
            email: 'themrdeveritas@gmail.com',
            role: 'ADMIN',
          },
        },
      };

      const result = await userApi.user({ id: '1' });

      expect(result.data).to.eql(expectedResult);
    });

    it('returns null when user cannot be found', async () => {
      const expectedResult = {
        data: {
          user: null,
        },
      };

      const result = await userApi.user({ id: '42' });

      expect(result.data).to.eql(expectedResult);
    });
  });

  describe('users: [User!]!', () => {
    it('returns all users', async () => {
      const expectedResult = {
        data: {
          users: [
            {
              id: '1',
              username: 'Deveritas',
              email: 'themrdeveritas@gmail.com',
              role: 'ADMIN',
            },
            {
              id: '2',
              username: 'ddavids',
              email: 'hello@david.com',
              role: null,
            },
          ],
        },
      };

      const result = await userApi.users();

      expect(result.data).to.eql(expectedResult);
    });
  });

  describe ('me: User', () => {
    it('returns null when not logged in', async () => {
      const result = await userApi.me({}, "");
      expect(result.data.data.me).to.eql(null);
    });

    it('returns the logged in user', async () => {
      const expectedResult = {
        data: {
          me: {
            id: '2',
            username: 'ddavids',
            email: 'hello@david.com',
            role: null,
          },
        },
      };

      const {
        data: { data: { signIn } }
      } = await userApi.signIn({
        login: 'ddavids',
        password: 'ddavids',
      });

      const result = await userApi.me({}, signIn.token);

      expect(result.data).to.eql(expectedResult);
    });
  });

  describe('signUp(username: String!, email: String!, password: String!): Token', () => {
    const newUser = {
      username: 'Test Dummy',
      email: 'dummy@testers.com',
      password: 'testdummy4ever',
    };

    let malformedRequests = [
      {
        desc: 'duplicate usernames',
        data: {username: 'Deveritas'},
        error: {
          name: "SequelizeUniqueConstraintError",
          errors: [ { message: "username must be unique" } ]
        },
      },
      {
        desc: 'empty usernames',
        data: {username: ''},
        error: {
          name: "SequelizeValidationError",
          errors: [ { message: "Validation notEmpty on username failed" } ]
        },
      },
      {
        desc: 'duplicate email addresses',
        data: {email: 'hello@david.com'},
        error: {
          name: "SequelizeUniqueConstraintError",
          errors: [ { message: "email must be unique" } ]
        },
      },
      {
        desc: 'email addresses that are invalid',
        data: {email: 'bad address'},
        error: {
          name: "SequelizeValidationError",
          errors: [ { message: "Validation isEmail on email failed" } ]
        },
      },
      {
        desc: 'empty email addresses',
        data: {email: ''},
        error: {
          name: "SequelizeValidationError",
          errors: [ { message: "Validation notEmpty on email failed" } ]
        },
      },
      {
        desc: 'passwords less than 7 characters',
        data: {password: 'aaaaaa'},
        error: {
          name: "SequelizeValidationError",
          errors: [ { message: "Validation len on password failed" } ]
        },
      },
      {
        desc: 'passwords greater than 64 characters',
        data: {password: 'a'.repeat(65)},
        error: {
          name: "SequelizeValidationError",
          errors: [ { message: "Validation len on password failed" } ]
        },
      },
      {
        desc: 'empty passwords',
        data: {password: ''},
        error: {
          name: "SequelizeValidationError",
          errors: [ { message: "Validation notEmpty on password failed" } ]
        },
      },
    ];

    for (const malformedRequest of malformedRequests) {
      it('returns an error because it forbids '+malformedRequest.desc, async () => {
        let variables = {  ...newUser, ...malformedRequest.data };

        let response = await userApi.signUp(variables);

        const {
          data: {
            data,
            errors: [ { extensions: { exception: {
              name,
              errors: [ { message } ]
            } } }]
          }
        } = response;

        expect(data).to.be.null;
        expect(name).to.be.eql(malformedRequest.error.name);
        expect(message).to.be.eql(malformedRequest.error.errors[0].message);
      });
    }

    it('creates a valid User and returns a login token', async () => {
      const {
        data: { data: { signUp: { token } } },
      } = await userApi.signUp(newUser);

      expect(token).to.be.a('string');

      const {
        data: { data: { me: { id } } }
      } = await userApi.me({}, token);

      userIdToDelete = id;
    });
  });

  describe('signIn(login: String!, password: String!): Token!', () => {
    it('returns a JWT token when given a valid login', async () => {
      const result = await userApi.signIn({
        login: 'ddavids',
        password: 'ddavids',
      });

      expect(result.data.data.signIn.token).to.be.a('string');
    });

    it('errors when given an invalid password', async () => {
      const result = await userApi.signIn({
        login: 'ddavids',
        password: 'bad',
      });

      expect(result.data.data).to.be.null;
      expect(result.data.errors[0].message).to.eql('No user found with this login credentials.')
    });

    it('errors when given an invalid username', async () => {
      const result = await userApi.signIn({
        login: 'bad',
        password: 'ddavids',
      });

      expect(result.data.data).to.be.null;
      expect(result.data.errors[0].message).to.eql('No user found with this login credentials.')
    });
  });

  describe('deleteUser(id: String!): Boolean!', () => {
    it('returns an error because only admins can delete a user', async () => {
      const {
        data: { data: { signIn } }
      } = await userApi.signIn({
        login: 'ddavids',
        password: 'ddavids',
      });

      const {
        data: { errors },
      } = await userApi.deleteUser({ id: '1' }, signIn.token);

      expect(errors[0].message).to.eql('Not authorized as admin.');
    });

    it('deletes users for admins', async () => {
      const {
        data: { data: { signIn } }
      } = await userApi.signIn({
        login: 'Deveritas',
        password: 'wasddoom',
      });

      const {
        data: { data: { deleteUser } },
      } = await userApi.deleteUser({ id: userIdToDelete }, signIn.token);

      expect(deleteUser).to.eql(true);
    });

    it('returns false when deleting users that don\'t exist', async () => {
      const {
        data: { data: { signIn } }
      } = await userApi.signIn({
        login: 'Deveritas',
        password: 'wasddoom',
      });

      const {
        data: { data: { deleteUser } },
      } = await userApi.deleteUser({ id: '42' }, signIn.token);

      expect(deleteUser).to.eql(false);
    });
  });
});