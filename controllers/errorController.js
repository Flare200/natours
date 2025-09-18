import AppError from "../utils/appError.js";

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again!', 401);
};

const handleJWTExpiredError = () => {
  return new AppError('Your token has expired. Please log in again!', 401);
};

const sendErrorDev = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  // B) RENDERED WEBSITE
    console.error('Error', err);
    
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });  
};

const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      // Operational, trusted error: send message to client
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    console.error('Error', err);

    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
    });
  }
  // B) RENDERED WEBSITE
    if (err.isOperational) {
      // Operational, trusted error: send message to client
      return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: err.message,
      });
    }
    console.error('Error', err);

    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: 'Please try again later.',
    });
};

export default (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  }
  else if (process.env.NODE_ENV === 'production') {
    let error = { ...err, name: err?.name, errmsg: err?.errmsg };
    error.message = err.message;

    if(error.name === 'CastError') {
      error = handleCastErrorDB(error); // Handle invalid ObjectId errors
    }
    if(error.code === 11000) {
      error = handleDuplicateFieldsDB(error); // Handle duplicate key errors
    }
    if(error.name === 'ValidationError') {
      error = handleValidationErrorDB(error); // Handle validation errors
    }
    if(error.name === 'JsonWebTokenError') {
      error = handleJWTError(); // Handle JWT Validation Errors
    }
    if(error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError(); // Handle JWT Expiration Errors
    }

    sendErrorProd(error, req, res);
  }
};