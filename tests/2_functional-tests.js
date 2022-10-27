const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  let firstInsertedID; // Used to store the first inserted ID and use it later in the PUT tests.

  this.timeout(10000);

  suite('POST /api/issues/{project} => object with issue data', () => {
    test('Every field filled in', done => {
      chai.request(server)
        .post('/api/issues/test')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          issue_title : 'Every field filled in',
          issue_text : 'Text',
          created_by : 'Created by',
          assigned_to : 'Assigned to',
          status_text : 'Filter me'
        })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.equal(res.body.issue_title, 'Every field filled in');
          assert.equal(res.body.issue_text, 'Text');
          assert.equal(res.body.created_by, 'Created by');
          assert.equal(res.body.assigned_to, 'Assigned to');
          assert.equal(res.body.status_text, 'Filter me');
          assert.equal(res.body.open, true);
          // ID to be used later in the PUT tests.
          firstInsertedID = res.body._id;
          done();
        });
    });

    test('Required fields filled in', done => {
      chai.request(server)
        .post('/api/issues/test')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          issue_title : 'Required fields filled in',
          issue_text : 'Text',
          created_by : 'Created by',
        })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.equal(res.body.issue_title, 'Required fields filled in');
          assert.equal(res.body.issue_text, 'Text');
          assert.equal(res.body.created_by, 'Created by');
          assert.equal(res.body.assigned_to, '');
          assert.equal(res.body.status_text, '');
          assert.equal(res.body.open, true);
          done();
        });
    });

    test('Missing required fields', done => {
      chai.request(server)
        .post('/api/issues/test')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          issue_title : 'Missing required fields',
          issue_text : 'Property "assigned_to" was not filled',
        })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.equal(res.body.error, 'required field(s) missing');
          done();
        });
    });
  });

  suite('GET /api/issues/{project} => Array of objects with issue data', () => {
    test('No filter', done => {
      chai.request(server)
        .get('/api/issues/test')
        .set('content-type', 'application/x-www-form-urlencoded')
        .query({})
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.isArray(res.body, 'body is array');
          assert.isNotEmpty(res.body);
          done();
        });
    });

    test('One filter', done => {
      chai.request(server)
        .get('/api/issues/test')
        .set('content-type', 'application/x-www-form-urlencoded')
        .query({ issue_text: 'Text' })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.isArray(res.body, 'body is array');
          assert.isNotEmpty(res.body);
          assert.equal(res.body[0].issue_text, 'Text');
          done();
        });
    });

    test('Multiple filters (test for multiple fields you know will be in the db for a return)', done => {
      chai.request(server)
        .get('/api/issues/test')
        .set('content-type', 'application/x-www-form-urlencoded')
        .query({ issue_text: 'Text', assigned_to: 'Assigned to' })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.isArray(res.body, 'body is array');
          assert.isNotEmpty(res.body);
          assert.equal(res.body[0].issue_title, 'Every field filled in');
          assert.equal(res.body[0].issue_text, 'Text');
          assert.equal(res.body[0].created_by, 'Created by');
          assert.equal(res.body[0].assigned_to, 'Assigned to');
          assert.equal(res.body[0].status_text, 'Filter me');
          assert.equal(res.body[0].open, true);
          done();
        });
    });
  });

  suite('PUT /api/issues/{project} => text', () => {
    test('One field to update', done => {
      chai.request(server)
        .put('/api/issues/test')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({ _id: firstInsertedID, issue_title: 'One field to update' })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.equal(res.body.result, 'successfully updated');
          assert.equal(res.body._id, firstInsertedID);
          done();
        });
    });

    test('Multiple fields to update', done => {
      chai.request(server)
        .put('/api/issues/test')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          _id : firstInsertedID,
          issue_title : 'Multiple fields to update',
          issue_text : 'Another field updated'
        })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.equal(res.body.result, 'successfully updated');
          assert.equal(res.body._id, firstInsertedID);
          done();
        });
    });

    test('Update an issue with missing _id:', done => {
      chai.request(server)
        .put('/api/issues/test')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({ issue_title: 'One field to update' })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.equal(res.body.error, 'missing _id');
          done();
        });
    });

    test('No body', done => {
      chai.request(server)
        .put('/api/issues/test')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({ _id: firstInsertedID })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.equal(res.body.error, 'no update field(s) sent');
          assert.equal(res.body._id, firstInsertedID);
          done();
        });
    });

    test('Update an issue with an invalid _id:', done => {
      chai.request(server)
        .put('/api/issues/test')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({ _id: 104729, issue_title: 'One field to update' })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.equal(res.body.error, 'could not update');
          assert.equal(res.body._id, 104729);
          done();
        });
    });
  });

  suite('DELETE /api/issues/{project} => text', () => {
    test('Valid _id', done => {
      chai.request(server)
        .delete('/api/issues/test')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({ _id: firstInsertedID })
        .end(( err,res ) => {
          assert.equal(res.body.result, 'successfully deleted');
          assert.equal(res.body._id, firstInsertedID);
          done();
        });
    });

    test('Delete an issue with an invalid _id:', done => {
      chai.request(server)
        .delete('/api/issues/test')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({ _id: 104729 })
        .end(( err,res ) => {
          assert.equal(res.body.error, 'could not delete');
          assert.equal(res.body._id, 104729);
          done();
        });
    });

    test('No _id', done => {
      chai.request(server)
        .delete('/api/issues/test')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({})
        .end((err, res) => {
          assert.equal(res.body.error, 'missing _id');
          done();
        });
    });
  });
});
