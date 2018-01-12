'use strict';

const Config = require('getconfig');
const Crypto = require('crypto');
const Joi = require('joi');
const { promisify } = require('util');

module.exports = {
  description: 'Ingest metrics from Prosody',
  tags: ['api', 'metrics'],
  handler: async function (request, h) {

    const { eventType, data } = request.payload;
    const { session_id, room_id } = data;
    let { name } = data;
    const now = new Date();

    const redis_rpush = promisify(this.redis.rpush.bind(this.redis));
    //$lab:coverage:off$
    if (name && Config.talky.metrics && Config.talky.metrics.maskRoomNames) {
      name = Crypto.createHash('sha1').update(name).digest('base64');
    }
    //$lab:coverage:on$

    const event = {
      created_at: now,
      updated_at: now,
      type: eventType,
      room_id: null,
      actor_id: session_id
    };
    if (room_id) {
      event.room_name = name;
      event.room_id = room_id;
    }

    await redis_rpush('events', JSON.stringify(event));
    return h.response();
  },
  validate: {
    payload: {
      eventType: Joi.string(),
      data: Joi.object({
        room_id: Joi.string(),
        session_id: Joi.string(),
        user_id: Joi.string(),
        jid: Joi.string(),
        name: Joi.string()
      }).unknown()
    }
  },
  auth: 'internal-api'
};
