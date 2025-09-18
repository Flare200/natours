import Tour from './../models/tourModel.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import { createOne, deleteOne, getAll, getOne, updateOne } from './handlerFactory.js';
import multer from 'multer';
import sharp from 'sharp';

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if(file.mimetype.startsWith('image')) {
    cb(null, true);
  }
  else {
    cb(new AppError('Not an image.  Please upload only images', 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

const uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

const resizeTourImages = catchAsync(async (req, res, next) => {
  if(!req.files.imageCover || ! req.files.images) {
    return next();
  }

  // 1) Cover Image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) Images
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    }),
  );

  console.log(req.body);
  next();
});

const aliasTopTours = (req, res, next) => {
  req.url =
    '/?sort=-ratingsAverage,price&fields=ratingsAverage,price,name,difficulty,summary&limit=5';
  next();
};

const getAllTours = getAll(Tour);
// const getAllTours = catchAsync(async (req, res, next) => {
//   // Execute Query
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();

//   const tours = await features.query;

//   // Send response
//   res.status(200).json({
//     status: 'success',
//     results: tours.length,
//     data: {
//       tours,
//     },
//   });
// });

const getTour = getOne(Tour, { path: 'reviews'});
// const getTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findById(req.params.id).populate('reviews');
  
//     if (!tour) {
//       return next(new AppError(`No tour found with ID: ${req.params.id}`, 404));
//     }

//     res.status(200).json({
//       status: 'success',
//       data: {
//           tour,
//       },
//   });
// });

const createTour = createOne(Tour);
// const createTour = catchAsync(async (req, res, next) => {
//   const newTour = await Tour.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour,
//     },
//   });
// });

const updateTour = updateOne(Tour);
// const updateTour = catchAsync(async(req, res, next) => {
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//       runValidators: true,
//     });
//   if (!tour) {
//     return next(new AppError(`No tour found with ID: ${req.params.id}`, 404));
//   }

//     res.status(200).json({
//       status: 'success',
//       data: {
//         tour,
//       },
//     });
// });

const deleteTour = deleteOne(Tour);
// const deleteTour = catchAsync(async (req, res, next) => {
//   const tour  = await Tour.findByIdAndDelete(req.params.id);
//   if (!tour) {
//     return next(new AppError(`No tour found with ID: ${req.params.id}`, 404));
//   }

//     res.status(204).json({
//       status: 'success',
//       data: null,
//     });
// });

const getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
      {
        $match: { ratingsAverage: { $gte: 4.5 } } // Get all tours with ratings >= 4.5
      },
      {
        $group: {
          _id: { $toUpper: '$difficulty' }, // Group by difficulty
          numRatings: { $sum: '$ratingsQuantity' }, // Sum ratings quantity
          numTours: { $sum: 1 }, // Count number of tours
          avgRating: { $avg: '$ratingsAverage' }, // Average ratings
          avgPrice: { $avg: '$price'}, // Average price
          minPrice: { $min: '$price'}, // Minimum price
          maxPrice: { $max: '$price'}, // Maximum price
        }
      },
      {
        $sort: { avgPrice: 1 } // Sort by average price in ascending order
      },
      // {
      //   $match: { _id: { $ne: 'EASY' } } // Exclude easy tours
      // }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats,
      },
    });
});

const getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = Number(req.params.year);
    const plan = await Tour.aggregate([
      {
        $unwind: '$startDates' // Unwind the startDates array to get individual dates
      },
      {
        $match: {
          startDates: { // Match tours that start within the specified year
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$startDates' }, // Group by month
          numTourStarts: { $sum: 1 }, // Count number of tours
          tours: { $push: '$name' } // Collect tour names
        }
      },
      {
        $addFields: { month: '$_id'} // Add month field
      },
      {
        $project: {
          _id: 0 // Exclude _id field
        }
      },
      {
        $sort: { numTourStarts: -1 } // Sort by number of tour starts in descending order
      },
      {
        $limit: 12 // Limit to 12 months
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        plan,
      },
    });
});

// '/tours-within/:distance/center/:latlng/unit/:unit'
const getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if(!lat || !lng) {
    next(new AppError('Please provide latitude and longitude in the format: lat,lng', 400));
  }

  const tours = await Tour.find({
    startLocation: {
      $geoWithin: {
        $centerSphere: [
          [lng, lat],
          radius,
        ],
      },
    },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours,
    },
  });
});

const getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if(!lat || !lng) {
    next(new AppError('Please provide latitude and longitude in the format: lat,lng', 400));
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: { // Get distances from a point
        near: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      }
    },
    {
      $project: {
        distance: 1,
        name: 1,
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      distances,
    },
  });
});

export {
  getAllTours,
  getTour,
  createTour,
  updateTour,
  deleteTour,
  aliasTopTours,
  getTourStats,
  getMonthlyPlan,
  getToursWithin,
  getDistances,
  uploadTourImages,
  resizeTourImages
};