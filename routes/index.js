const { chatGPT } = require('../controller');

const router = require('express').Router();

router.get('/chatGPT', chatGPT);

module.exports = {
  routes: router
}