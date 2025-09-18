import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import APIFeatures from "../utils/apiFeatures.js";

const deleteOne = Model => catchAsync(async (req, res, next) => {
  const doc  = await Model.findByIdAndDelete(req.params.id);
  if (!doc) {
    return next(new AppError(`No document found with ID: ${req.params.id}`, 404));
  }

    res.status(204).json({
      status: 'success',
      data: null,
    });
});

const updateOne = Model => catchAsync(async(req, res, next) => {
  const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
  if (!doc) {
    return next(new AppError(`No document found with ID: ${req.params.id}`, 404));
  }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
});

const createOne = Model => catchAsync(async (req, res, next) => {
  const newDoc = await Model.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      data: newDoc,
    },
  });
});

const getOne = (Model, popOptions) => catchAsync(async (req, res, next) => {
  let query = Model.findById(req.params.id);
  if (popOptions) {
    query = query.populate(popOptions);
  }
  const doc = await query;

  if (!doc) {
    return next(
      new AppError(`No document found with ID: ${req.params.id}`, 404),
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: doc,
    },
  });
});

const getAll = Model => catchAsync(async (req, res, next) => {
  // To allow for nested GET reviews on tour
  let filter = {};
  if(req.params.tourId) {
    filter = { tour: req.params.tourId };
  }

  // Execute Query
  const features = new APIFeatures(Model.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const docs = await features.query;

  // Send response
  res.status(200).json({
    status: 'success',
    results: docs.length,
    data: {
      data: docs,
    },
  });
});

export {
  deleteOne,
  updateOne,
  createOne,
  getOne,
  getAll
};