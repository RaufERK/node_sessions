const mongoose = require('mongoose');

const dbOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

const User = mongoose.model('User', {
  username: { type: String, unique: true },
  password: String,
});

const Item = mongoose.model('Item', { name: String });

module.exports = {
  Item,
  User,
  dbOptions,
};
