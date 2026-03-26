const { validationResult } = require('express-validator');
const ErrorResponse = require('../utils/errorResponse');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(e => e.msg).join(', ');
    return next(new ErrorResponse(messages, 400));
  }
  next();
};

module.exports = validate;
