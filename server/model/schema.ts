import * as mongoose from 'mongoose';

const Message = mongoose.model(
  'messages',
  new mongoose.Schema({
    message: {type: String}
  })
);

const Users = mongoose.model(
  'users',
  new mongoose.Schema({
    userid    : {type: String},
    namespace : {type: String},
    room      : {type: String},
  })
);

export { Message };
export { Users };




