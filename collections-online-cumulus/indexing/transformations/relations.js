'use strict';
const _ = require('lodash');
const cip = require('../../../services/cip');

function relatedFilenameComparison(assetA, assetB) {
  var filenameA = assetA.filename;
  var filenameB = assetB.filename;
  return filenameA.localeCompare(filenameB);
}

module.exports = metadata => {
  metadata.related = {};
  // Transforms the binary representations of each relation.
  const masterAssets = metadata.related_master_assets;
  const subAssets = cip.parseBinaryRelations(metadata.related_sub_assets);
  delete metadata.related_master_assets;
  delete metadata.related_sub_assets;

  // Sort these by their filenames and specify a direction
  masterAssets.sort(relatedFilenameComparison);
  masterAssets.forEach(asset => asset.direction = 'parent');

  subAssets.sort(relatedFilenameComparison);
  subAssets.forEach(asset => asset.direction = 'child');

  metadata.related.assets = _.concat(
    masterAssets,
    subAssets
  );
  metadata.related.assets.forEach(asset => {
    // Prepend the collection on the related asset id
    if(typeof(asset.id) === 'number') {
      asset.id = metadata.collection + '-' + asset.id;
    }
  });
  return metadata;
};
