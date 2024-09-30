'use strict';
const mongoose = require('mongoose');

module.exports = function (app) {

  const replySchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, default: new mongoose.Types.ObjectId() },
    text: String,
    delete_password: String,
    created_on: { type: Date, default: Date.now },
    reported: { type: Boolean, default: false }
  });

  const threadSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, default: new mongoose.Types.ObjectId() },
    text: String,
    delete_password: String,
    board: String,
    created_on: { type: Date, default: Date.now },
    bumped_on: { type: Date, default: Date.now },
    reported: { type: Boolean, default: false },
    replies: [replySchema]
  });

  const Thread = mongoose.model('Thread', threadSchema);

  app.route('/api/threads/:board')
    .post(async (req, res) => {
      const { text, delete_password } = req.body;
      const board = req.params.board;

      try {
        const newThread = new Thread({
          text,
          delete_password,
          board
        });
        await newThread.save();
        res.redirect(`/b/${board}/`);
      } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
      }
    })

    .get(async (req, res) => {
      const board = req.params.board;

      try {
        let threads = await Thread.find({ board })
          .sort({ bumped_on: -1 })
          .limit(10)
          .lean();

        threads = threads.map(thread => {
          delete thread.delete_password;
          delete thread.reported;

          thread.replies.sort((a, b) => b.created_on - a.created_on);

          thread.replies = thread.replies.slice(0, 3).map(reply => {
            return {
              _id: reply._id,
              text: reply.text,
              created_on: reply.created_on,
            };
          });

          thread.replycount = thread.replies.length;

          return thread;
        });

        res.json(threads);
      } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
      }
    })

    .delete(async (req, res) => {
      const { thread_id, delete_password } = req.body;

      try {
        const thread = await Thread.findById(thread_id);
        if (!thread) return res.send('Thread not found');

        if (thread.delete_password !== delete_password) {
          return res.send('incorrect password');
        }

        await Thread.findByIdAndDelete(thread_id);
        res.send('success');
      } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
      }
    })

    .put(async (req, res) => {
      const { thread_id } = req.body;

      try {
        const thread = await Thread.findByIdAndUpdate(thread_id, { reported: true });
        if (!thread) return res.send('Thread not found');
        res.send('reported');
      } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
      }
    });

  app.route('/api/replies/:board')
    .post(async (req, res) => {
      const { thread_id, text, delete_password } = req.body;
      const board = req.params.board;

      try {
        const reply = {
          _id: new mongoose.Types.ObjectId(),
          text,
          delete_password,
          created_on: new Date(),
          reported: false,
        };

        const thread = await Thread.findByIdAndUpdate(
          thread_id,
          {
            $set: { bumped_on: reply.created_on },
            $push: { replies: reply },
          },
          { new: true }
        );

        if (!thread) return res.send('Thread not found');
        res.redirect(`/b/${board}/${thread_id}`);
      } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
      }
    })

    .get(async (req, res) => {
      const thread_id = req.query.thread_id;

      try {
        const thread = await Thread.findById(thread_id)
          .lean();

        if (!thread) return res.send('Thread not found');

        delete thread.delete_password;
        delete thread.reported;

        thread.replies = thread.replies.map(reply => {
          delete reply.delete_password;
          delete reply.reported;
          return reply;
        });

        res.json(thread);
      } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
      }
    })

    .delete(async (req, res) => {
      const { thread_id, reply_id, delete_password } = req.body;

      try {
        const thread = await Thread.findOne({ _id: thread_id });
        if (!thread) return res.send('Thread not found');

        const reply = thread.replies.id(reply_id);
        if (!reply) return res.send('Reply not found');

        if (reply.delete_password !== delete_password) {
          return res.send('incorrect password');
        }

        reply.text = '[deleted]';
        await thread.save();
        res.send('success');
      } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
      }
    })

    .put(async (req, res) => {
      const { thread_id, reply_id } = req.body;

      try {
        const thread = await Thread.findOne({ _id: thread_id });
        if (!thread) return res.send('Thread not found');

        const reply = thread.replies.id(reply_id);
        if (!reply) return res.send('Reply not found');

        reply.reported = true;
        await thread.save();
        res.send('reported');
      } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
      }
    });

};
