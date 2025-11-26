'use strict';

/**
 * augmenter-conf service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::augmenter-conf.augmenter-conf');
