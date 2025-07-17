'use strict';

/**
 * pointer router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::pointer.pointer');
