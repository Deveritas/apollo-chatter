export const createUsersWithMessages = async (models, date) => {
  await models.User.create(
    {
      username: 'Deveritas',
      email: 'themrdeveritas@gmail.com',
      password: 'wasddoom',
      role: 'ADMIN',
      messages: [{
        text: 'Writing this',
        createdAt: date.setSeconds(date.getSeconds() + 1),
      }],
    },
    {include: [models.Message]},
  );

  await models.User.create(
    {
      username: 'ddavids',
      email: 'hello@david.com',
      password: 'ddavids',
      messages: [
        {
          text: 'Happy to release ...',
          createdAt: date.setSeconds(date.getSeconds() + 1),
        },
        {
          text: 'Published a complete ...',
          createdAt: date.setSeconds(date.getSeconds() + 1),
        },
      ],
    },
    {include: [models.Message]},
  );
};