const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function () {
    let threadId;
    let replyId;
    const board = 'testboard';
    const threadText = 'Test thread';
    const threadPassword = 'password123';
    const replyText = 'Test reply';
    const replyPassword = 'replypassword';

    suite('API ROUTING FOR /api/threads/:board', function () {

        test('1. Creating a new thread: POST request to /api/threads/{board}', function (done) {
            chai.request(server)
                .post('/api/threads/' + board)
                .send({
                    text: threadText,
                    delete_password: threadPassword
                })
                .end(function (err, res) {
                    assert.equal(res.status, 200);
                    done();
                });
        });

        test('2. Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function (done) {
            chai.request(server)
                .get('/api/threads/' + board)
                .end(function (err, res) {
                    assert.equal(res.status, 200);
                    assert.isArray(res.body);
                    assert.isAtMost(res.body.length, 10);
                    if (res.body.length > 0) {
                        const thread = res.body[0];
                        assert.property(thread, '_id');
                        assert.property(thread, 'text');
                        assert.property(thread, 'created_on');
                        assert.property(thread, 'bumped_on');
                        assert.property(thread, 'replies');
                        assert.isArray(thread.replies);
                        assert.isAtMost(thread.replies.length, 3);
                        threadId = thread._id;
                    }
                    done();
                });
        });

        test('3. Reporting a thread: PUT request to /api/threads/{board}', function (done) {
            chai.request(server)
                .put('/api/threads/' + board)
                .send({
                    thread_id: threadId
                })
                .end(function (err, res) {
                    assert.equal(res.status, 200);
                    assert.equal(res.text, 'reported');
                    done();
                });
        });

        test('4. Deleting a thread with incorrect password: DELETE request to /api/threads/{board}', function (done) {
            chai.request(server)
                .delete('/api/threads/' + board)
                .send({
                    thread_id: threadId,
                    delete_password: 'wrongpassword'
                })
                .end(function (err, res) {
                    assert.equal(res.status, 200);
                    assert.equal(res.text, 'incorrect password');
                    done();
                });
        });

        test('5. Deleting a thread with correct password: DELETE request to /api/threads/{board}', function (done) {
            chai.request(server)
                .delete('/api/threads/' + board)
                .send({
                    thread_id: threadId,
                    delete_password: threadPassword
                })
                .end(function (err, res) {
                    assert.equal(res.status, 200);
                    assert.equal(res.text, 'success');
                    done();
                });
        });

    });

    suite('API ROUTING FOR /api/replies/:board', function () {

        let threadIdForReply;

        suiteSetup(function (done) {
            chai.request(server)
                .post('/api/threads/' + board)
                .send({
                    text: 'Thread for replies',
                    delete_password: threadPassword
                })
                .end(function (err, res) {
                    chai.request(server)
                        .get('/api/threads/' + board)
                        .end(function (err, res) {
                            threadIdForReply = res.body[0]._id;
                            done();
                        });
                });
        });

        test('1. Creating a new reply: POST request to /api/replies/{board}', function (done) {
            chai.request(server)
                .post('/api/replies/' + board)
                .send({
                    thread_id: threadIdForReply,
                    text: replyText,
                    delete_password: replyPassword
                })
                .end(function (err, res) {
                    assert.equal(res.status, 200);
                    done();
                });
        });

        test('2. Viewing a single thread with all replies: GET request to /api/replies/{board}', function (done) {
            chai.request(server)
                .get('/api/replies/' + board)
                .query({
                    thread_id: threadIdForReply
                })
                .end(function (err, res) {
                    assert.equal(res.status, 200);
                    assert.isObject(res.body);
                    assert.property(res.body, '_id');
                    assert.property(res.body, 'text');
                    assert.property(res.body, 'created_on');
                    assert.property(res.body, 'bumped_on');
                    assert.property(res.body, 'replies');
                    assert.isArray(res.body.replies);
                    if (res.body.replies.length > 0) {
                        const reply = res.body.replies[0];
                        assert.property(reply, '_id');
                        assert.property(reply, 'text');
                        assert.property(reply, 'created_on');
                        replyId = reply._id;
                    }
                    done();
                });
        });

        test('3. Reporting a reply: PUT request to /api/replies/{board}', function (done) {
            chai.request(server)
                .put('/api/replies/' + board)
                .send({
                    thread_id: threadIdForReply,
                    reply_id: replyId
                })
                .end(function (err, res) {
                    assert.equal(res.status, 200);
                    assert.equal(res.text, 'reported');
                    done();
                });
        });

        test('4. Deleting a reply with incorrect password: DELETE request to /api/replies/{board}', function (done) {
            chai.request(server)
                .delete('/api/replies/' + board)
                .send({
                    thread_id: threadIdForReply,
                    reply_id: replyId,
                    delete_password: 'wrongpassword'
                })
                .end(function (err, res) {
                    assert.equal(res.status, 200);
                    assert.equal(res.text, 'incorrect password');
                    done();
                });
        });

        test('5. Deleting a reply with correct password: DELETE request to /api/replies/{board}', function (done) {
            chai.request(server)
                .delete('/api/replies/' + board)
                .send({
                    thread_id: threadIdForReply,
                    reply_id: replyId,
                    delete_password: replyPassword
                })
                .end(function (err, res) {
                    assert.equal(res.status, 200);
                    assert.equal(res.text, 'success');
                    done();
                });
        });

        suiteTeardown(function (done) {
            chai.request(server)
                .delete('/api/threads/' + board)
                .send({
                    thread_id: threadIdForReply,
                    delete_password: threadPassword
                })
                .end(function (err, res) {
                    done();
                });
        });

    });

});
