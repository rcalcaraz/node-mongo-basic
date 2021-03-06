// Load dependencies
var path = require('path');
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var bcrypt = require('bcrypt-nodejs');
var User = require(path.join('..', 'server', 'model', 'user.js'));
var chai = require('chai');
var chaiHttp = require('chai-http');
var should = chai.should();
var server = require(path.join('..', 'app.js'));

chai.use(chaiHttp);

describe('[Users TEST]', function() {
    // token for endpoints with authentication
    var userToken;
    var adminToken;

    // remove users
    beforeEach(function(done) {
        User.remove({}, function(err) {
            if (!err) {
                done();
            }
        });
    });

    // add one standard user
    beforeEach(function(done) {
        var user = new User({
            name: 'john',
            password: bcrypt.hashSync("pass"),
            role: 'user'
        });
        user.save(function(err, user) {
            if (!err) {
                done();
            }
        });
    });

    // add one admin
    beforeEach(function(done) {
        var user = new User({
            name: 'mike',
            password: bcrypt.hashSync("pass"),
            role: 'admin'
        });
        user.save(function(err, user) {
            if (!err) {
                done();
            }
        });
    });

    // get a user token 
    beforeEach(function(done) {
        User.findOne({ role: 'user' }, function(err, user) {
            chai.request(server)
                .post('/session')
                .send({ name: user.name, password: user.password })
                .end(function(err, res) {
                    userToken = res.body.token;
                    done();
                });
        });
    });

    // get a admin token 
    beforeEach(function(done) {
        User.findOne({ role: 'admin' }, function(err, user) {
            chai.request(server)
                .post('/session')
                .send({ name: user.name, password: user.password })
                .end(function(err, res) {
                    adminToken = res.body.token;
                    done();
                });
        });
    });

    // remove all collections
    after(function(done) {
        User.remove({}, function(err) {
            if (!err) {
                done();
            }
        });
    });

    describe('/GET users', function() {
        it('it should not GET all the users without a admin token', function(done) {
            chai.request(server)
                .get('/users')
                .set('x-access-token', userToken)
                .end(function(err, res) {
                    res.should.have.status(403);
                    res.body.should.be.empty;
                    done();
                });
        });
    });

    describe('/POST users', function() {

        it('it should POST a new user', function(done) {
            var user = new User({
                name: "post-test-user",
                password: "pass",
                role: "admin"
            });
            chai.request(server)
                .post('/users')
                .send(user)
                .end(function(err, res) {
                    bcrypt.compare(user.password, res.body.password, function(err, passCheck) {
                        if (!err) {
                            res.should.have.status(201);
                            res.body.should.be.a('object');
                            res.body.should.have.property('name').eql(user.name);
                            res.body.should.have.property('role').eql(user.role);
                            passCheck.should.be.true;
                            done();
                        }
                    });
                });
        });

        it('it should not POST a new user without password', function(done) {
            var user = new User({
                name: "post-password-test-user",
                role: "admin"
            });
            chai.request(server)
                .post('/users')
                .send(user)
                .end(function(err, res) {
                    res.should.have.status(400);
                    res.body.should.be.empty;
                    done();
                });
        });

        it('it should not POST a new user if he already exists', function(done) {
            var user1 = new User({
                name: "repeated",
                password: "pass",
                role: "admin"
            });

            var user2 = new User({
                name: "repeated",
                password: "pass",
                role: "admin"
            });

            user1.save(function(err, user) {
                if (!err) {
                    chai.request(server)
                        .post('/users')
                        .send(user2)
                        .end(function(err, res) {
                            res.should.have.status(409);
                            res.body.should.be.empty;
                            done();
                        });
                }
            });
        });
    });


    describe('/POST users', function() {

        it('it should DELETE a user', function(done) {
            var user = new User({
                name: "delete-test-user",
                password: "pass",
                role: "admin"
            });
            user.save(function(err, user) {
                chai.request(server)
                    .delete('/users/' + user._id)
                    .set('x-access-token', adminToken)
                    .end(function(err, res) {
                        res.should.have.status(200);
                        res.body.should.have.property('name').eql(user.name);
                        done();
                    });
            });
        });

        it('it should not DELETE a user with a invalid id', function(done) {
            var invalidId = "1234";
            var user = new User({
                name: "delete-test-remove-user",
                password: "pass",
                role: "admin"
            });
            user.save(function(err, user) {
                chai.request(server)
                    .delete('/users/' + invalidId)
                    .set('x-access-token', adminToken)
                    .end(function(err, res) {
                        res.should.have.status(404);
                        res.body.should.be.empty;
                        done();
                    });
            });
        });

        it('it should not DELETE a user with a standard user token ', function(done) {
            var user = new User({
                name: "delete-test-token-user",
                password: "pass",
                role: "admin"
            });
            user.save(function(err, user) {
                chai.request(server)
                    .delete('/users/' + user._id)
                    .set('x-access-token', userToken)
                    .end(function(err, res) {
                        res.should.have.status(403);
                        res.body.should.be.empty;
                        done();
                    });
            });
        });
    });
});