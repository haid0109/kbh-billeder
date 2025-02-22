const _ = require('lodash');

const config = require('./config');

let helpers = {};

const REQUIRED_HELPERS = [
  'cleanDocumentId',
  'determinePlayers',
  'documentDescription',
  'documentLicense',
  'documentTitle',
  'generateSitemapElements',
  'getDownloadOptions',
  'isDownloadable',
  'isWatermarkRequired'
];

helpers.capitalizeFirstLetter = string => {
  if(typeof(string) === 'string') {
    return string.charAt(0).toUpperCase() + string.slice(1);
  } else {
    return string;
  }
};

helpers.checkRequiredHelpers = () => {
  REQUIRED_HELPERS.forEach((requiredHelper) => {
    if(typeof(helpers[requiredHelper]) !== 'function') {
      throw new Error('Missing required helper function: ' + requiredHelper);
    }
  });
};

helpers.decimals = function(n, decimals) {
  if (typeof(n) !== 'undefined' && n !== null) {
    return parseFloat(n).toFixed(decimals).replace('.', ',');
  } else {
    return n;
  }
};

helpers.generateSearchTitle = filters => {
  if(filters.q) {
    return 'Søgning på "' + filters.q + '"';
  } else {
    return 'Søgning';
  }
};

helpers.getDocumentURL = (metadata) => {
  //Detect and handle series
  if(!metadata.collection && metadata.url) {
    return `/${metadata.url}`;
  }

  let path = [metadata.collection];
  if(Object.keys(config.types).length > 1) {
    path.push(metadata.type);
  }
  path.push(metadata.id);
  return '/' + path.join('/');
};

helpers.getThumbnailURL = (metadata, size, watermarkPosition) => {
  if(metadata.file_format && metadata.file_format === 'MP3 Format') {
    return '../images/audio.jpg';
  }

  // Detect and handle series
  if(!metadata.collection && metadata.previewAssets) {
    return helpers.getThumbnailURL(metadata.previewAssets[0], size, watermarkPosition);
  }

  let path = [
    helpers.getDocumentURL(metadata),
    'thumbnail'
  ];
  if(size) {
    path.push(size);
    if(watermarkPosition) {
      path.push(watermarkPosition);
    }
  }
  return path.join('/');
};

const SOCIAL_THUMBNAIL_SIZE = 500;

helpers.getSocialThumbnailURL = (metadata) => {
  if(config.thumbnailSize >= SOCIAL_THUMBNAIL_SIZE) {
    console.warn('config.thumbnailSize should be < ' + SOCIAL_THUMBNAIL_SIZE);
  }
  return helpers.getThumbnailURL(metadata, SOCIAL_THUMBNAIL_SIZE);
};

helpers.getDownloadURL = (metadata, size) => {
  let path = [
    helpers.getDocumentURL(metadata),
    'download'
  ];
  if(size) {
    path.push(size);
  }
  return path.join('/');
};

helpers.getStreamURL = (metadata, size) => {
  let path = [
    helpers.getDocumentURL(metadata),
    'stream'
  ];
  return path.join('/');
};

helpers.getAudioURL = (metadata, size) => {
  let path = [
    helpers.getDocumentURL(metadata),
    'download'
  ];
  return path.join('/');
};

helpers.getAbsoluteURL = (req, relativePath) => {
  return req.protocol + '://' + req.get('host') + relativePath;
};

helpers.getDirectDownloadURL = (metadata) => {
  if(!config.cip || !config.cip.baseURL) {
    throw new Error('Expected the baseURL of the CIP to be configered');
  }
  return [
    config.cip.baseURL,
    'asset',
    'download',
    metadata.collection,
    metadata.id
  ].join('/');
};

helpers.getAssetField = (shortName) => {
  if(!config.types || !config.types.asset || !config.types.asset.fields) {
    throw new Error('Cannot get field. Missing config.types.asset.fields');
  }
  return config.types.asset.fields.find((field) => field.short === shortName);
};

helpers.licenseMapped = (metadata) => {
  let licenseId = helpers.documentLicense(metadata);
  if(licenseId !== null && typeof(licenseId) !== 'undefined') {
    return config.licenseMapping[licenseId];
  } else {
    return null;
  }
};

helpers.licenseLinked = function(license) {
  if (license && license in config.licenseMapping) {
    const licenseOptions = config.licenseMapping[license];
    return helpers.link(licenseOptions.url, license);
  } else {
    return license || 'Ukendt';
  }
};

helpers.link = function(url, text) {
  if(!text) {
    text = url;
  }
  return '<a href="' + url + '" target="_blank">' + text + '</a>';
};

helpers.searchInstitutionLink = function(catalog) {
  return '<a href="/søg?institution=' + catalog + '">' + catalog + '</a>';
};

// TODO: Consider if a localization function might be easier to use
helpers.thousandsSeparator = (number) => {
  if(number) {
    return number.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1.');
  } else {
    return number;
  }
};

helpers.translate = key => {
  if(config.translations[key]) {
    return config.translations[key];
  } else {
    return key;
  }
};

helpers.hasRelations = metadata => {
  return metadata && metadata.related && Object.keys(metadata.related)
  .reduce((result, type) => {
    const relatedOfType = metadata.related[type];
    return result + relatedOfType.length;
  }, 0) > 0;
};

/**
 * Use this method to get all values at the "end of a path" in an object.
 * It traverses the object along the path, if an array is found along the way
 * the result will contain an array of values for that sub-tree of the object.
 *
 * Example:
 *    object = {a: [{b: [{c: 'test'}, {c: 'this'}]}]}
 *    path = 'a.b.c'
 *    returns [['test', 'this']]
 *
 * @param {Object} object The object to look for values in.
 * @param {string} path The path used when looking for values.
 */
helpers.getAny = (object, path) => {
  if(typeof(path) === 'string') {
    // If given a string, split on dots and call recursively
    return helpers.getAny(object, path.split('.'));
  } else if(Array.isArray(path)){
    if(path.length === 0) {
      // Throw an error if requested with an empty path
      throw new Error('Expected some path');
    } else if(path.length === 1) {
      // We have arrived at the leaf of the path
      return object[path[0]];
    } else {
      const value = object[path[0]];
      const restOfPath = path.slice(1);
      if(Array.isArray(value)) {
        return value.map(item => {
          return helpers.getAny(item, restOfPath);
        });
      } else if(typeof(value) === 'object') {
        return helpers.getAny(value, restOfPath);
      }
      // Skipping values which are neither arrays nor objects
    }
  } else {
    throw new Error('Path had an unexpected type: ' + typeof(path));
  }
};

 /**
  * Use this method to get all values at the "end of a path" in an object,
  * you have multiple such paths and you want a flat array of values.
  * It traverses the object along each of the paths and returns a flattened
  * array of values.
  *
  * Example:
  *    object = {a: {b: [{c: 'test', d: 123}, {c: 'this'}]}}
  *    path = ['a.b.c', 'a.b.d']
  *    returns ['test', 'this', 123]
  *
  * @param {Object} object The object to look for values in.
  * @param {string[]} paths The paths used when looking for values.
  */
helpers.getAnyFlat = (object, paths) => {
  // For every path - getAny values
  const values = paths.map(path => {
    return helpers.getAny(object, path);
  });
  // Flatten them deep and filter out empty values.
  return _.flattenDeep(values);
};

 /**
  * Determine what media types a particular document "consists of".
  * The helper is currently used when determining icons on search result items.
  *
  * @param {Object} metadata The documents metadata object.
  */
helpers.determineMediaTypes = metadata => {
  if(metadata.file_format === 'MP3 Format') {
    return 'audio';
  }
  if(metadata.file_format === 'MPEG-4 Video') {
    return 'video';
  }

  return 'image';
};

/**
 * Prepares a return-url for being added as return parameter.
 *
 * @param {string} returnUrl The url
 * @returns {string} the encoded url
 */
helpers.encodeReturnState = function(returnUrl) {
  // Do a simple base64 encoding.
  return Buffer.from(returnUrl).toString('base64');
};

/**
 * Parses an encoded return-url state parameter into its original form
 *
 * @param {string} encodedUrl The encoded value.
 * @returns {string} The decoded value.
 */
helpers.decodeReturnState = function(encodedUrl) {
  // Do a simple base64 decoding.
  return Buffer.from(encodedUrl, 'base64').toString('ascii');
};

/**
 * Determines whether we're within the mobile breakpoint.
 *
 * @param $
 *   Jquery instance
 * @returns {boolean}
 */
helpers.isMobile = function($) {
  return $(window).width() < config.styling.mobileWidthBreakpoint;
};

module.exports = helpers;
