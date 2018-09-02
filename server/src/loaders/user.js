import DataLoader from 'dataloader';
import Sequelize from 'sequelize';

export const batchUsers = models => new DataLoader(async keys => {
  const users = await models.User.findAll({
    where: {
      id: {
        [Sequelize.Op.in]: keys
      },
    },
  });

  return keys.map(key => users.find(user => user.id === key));
});