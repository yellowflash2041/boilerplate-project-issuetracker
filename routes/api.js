'use strict';

const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const xssFilters  = require('xss-filters');
const ObjectId = require('mongodb').ObjectID;
const DB_URI = process.env.DB;

const client = new MongoClient(DB_URI, { useUnifiedTopology: true });
const dbName = 'fccissuetra';

module.exports = function (app) {

  app.route('/api/issues/:project')
  
    .get(function (req, res){
      let project = req.params.project;
      const query = req.query;
      if (query._id) {
        query._id = new ObjectId(query._id);
      }
      if (query.open === 'true') {
        query.open = true;
      }
      else if (query.open === 'false') {
        query.open = false;
      }

      if (client.topology === undefined) {
        client.connect((err) => {
          if (err !== null) {
            return;
          }

          const db = client.db(dbName);

          const collection = db.collection(project);
          collection.find(query).sort({ updated_on: -1 }).toArray((err, docs) => {
            if (err === null) {
              res.json(docs);
            } else {
              res.send(err);
            }
          });
        });
      } else {
        const db = client.db(dbName);

        const collection = db.collection(project);
        collection.find(query).sort({ updated_on: -1 }).toArray((err, docs) => {
          if (err === null) {
            res.json(docs);
          } else {
            res.send(err);
          }
        });
      }
    })
    
    .post(function (req, res){
      let project = req.params.project;
      const newIssue = {
        issue_title: req.body.issue_title,
        issue_text: req.body.issue_text,
        assigned_to: req.body.assigned_to || '',
        status_text: req.body.status_text || '',
        created_by: req.body.created_by,
        open: true
      };
      project = xssFilters.inHTMLData(project);

      // Sanitize input data.
      for (const input in newIssue) {
        if (Object.hasOwnProperty.call(newIssue, input) && input !== 'open') {
          const element = newIssue[input];
          newIssue[input] = xssFilters.inHTMLData(element);
          if (newIssue[input] === 'undefined') {
            newIssue[input] = undefined;
          }
        }
      }
      newIssue.created_on = new Date().toISOString();
      newIssue.updated_on = new Date().toISOString();

      if (newIssue.issue_title && newIssue.issue_text && newIssue.created_by) {
        if (client.topology === undefined) {
          client.connect((err) => {
            if (err !== null) {
              return;
            }

            const db = client.db(dbName);

            const collection = db.collection(project);
            collection.insertMany([newIssue], (err, result) => {
              if (err === null) {
                newIssue._id = result.insertedIds[0];
                res.json(newIssue);
              } else {
                res.send(err);
              }
            });
          });
        } else {
          const db = client.db(dbName);

          const collection = db.collection(project);
          collection.insertMany([newIssue], (err, result) => {
            if (err === null) {
              newIssue._id = result.insertedIds[0];
              res.json(newIssue);
            } else {
              res.send(err);
            }
          });
        }
      } else {
        res.json({ error: 'required field(s) missing' });
      }
    })
    
    .put(function (req, res){
      let project = req.params.project;
      project = xssFilters.inHTMLData(project);
      const inputs = req.body;
      const issueID = xssFilters.inHTMLData(inputs._id);

      if (issueID === 'undefined') {
        res.json({ error: 'missing _id' });
        return;
      }

      delete inputs._id; // Delete from object to check if all other inputs are empty.
      for (const input in inputs) {
        if (Object.hasOwnProperty.call(inputs, input)) {
          const element = inputs[input];
          if (!element) {
            delete inputs[input];
          } else {
            inputs[input] = xssFilters.inHTMLData(element);
          }
        }
      }

      if (Object.keys(inputs).length > 0) {
        // Assigned here just to meet the user stories.
        // If assigned before, an empty form could be sent.
        inputs.updated_on = new Date().toISOString();

        if (client.topology === undefined) {
          client.connect((err) => {
            if (err !== null) {
              return;
            }

            const db = client.db(dbName);

            const collection = db.collection(project);
            try {
              collection.updateOne(
                { _id: new ObjectId(issueID) },
                { $set: inputs },
                (err, result) => {
                  if (err === null) {
                    if (result.modifiedCount === 0) {
                      res.json({ error: 'could not update', '_id': issueID });
                    } else {
                      res.json({ result: 'successfully updated', '_id': issueID });
                    }
                  } else {
                    res.send(err);
                  }
                }
              );
            } catch (error) {
              res.json({ error: 'could not update', '_id': issueID });
            }
          });
        } else {
          const db = client.db(dbName);

          const collection = db.collection(project);
          try {
            collection.updateOne(
              { _id: new ObjectId(issueID) },
              { $set: inputs },
              (err, result) => {
                if (err === null) {
                  if (result.modifiedCount === 0) {
                    res.json({ error: 'could not update', '_id': issueID });
                  } else {
                    res.json({ result: 'successfully updated', '_id': issueID });
                  }
                } else {
                  res.send(err);
                }
              }
            );
          } catch (error) {
            res.json({ error: 'could not update', '_id': issueID });
          }
        }
      } else {
        res.json({ error: 'no update field(s) sent', '_id': issueID });
      }
    })
    
    .delete(function (req, res){
      let project = req.params.project;
      const issueID = req.body._id;

      if (issueID === undefined) {
        res.json({ error: 'missing _id' });
        return;
      }

      if (issueID) {
        if (client.topology === undefined) {
          client.connect((err) => {
            if (err !== null) {
              return;
            }

            const db = client.db(dbName);

            const collection = db.collection(project);
            try {
              collection.deleteOne({ _id: new ObjectId(issueID) }, (err, result) => {
                if (err === null) {
                  if (result.deletedCount === 0) {
                    res.json({ error: 'could not delete', '_id': issueID });
                  } else {
                    res.json({ result: 'successfully deleted', '_id': issueID });
                  }
                } else {
                  res.send(`could not delete ${issueID}`);
                }
              });
            } catch (error) {
              res.json({ error: 'could not delete', '_id': issueID });
            }
          });
        } else {
          const db = client.db(dbName);

          const collection = db.collection(project);
          try {
            collection.deleteOne({ _id: new ObjectId(issueID) }, (err, result) => {
              if (err === null) {
                if (result.deletedCount === 0) {
                  res.json({ error: 'could not delete', '_id': issueID });
                } else {
                  res.json({ result: 'successfully deleted', '_id': issueID });
                }
              } else {
                res.send(`could not delete ${issueID}`);
              }
            });
          } catch (error) {
            res.json({ error: 'could not delete', '_id': issueID });
          }
        }
      } else {
        res.send({});
      }
    });
    
};
