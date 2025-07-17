'use strict';

/**
 * pointer service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::pointer.pointer');
