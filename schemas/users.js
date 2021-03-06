
// # Users

var bcrypt = require('bcrypt')
  , authenticate;

module.exports = function(db) {
  var Email = db.SchemaTypes.Email
    , Groups = require('../schemas/groups')(db)
    , Users = new db.Schema({
        salt: String,
        hash: String,
        email: {
          type: Email,
          unique: true,
          required: true,
          lowercase: true
        },
        name: {
          first: {
            type: String,
            required: true
          },
          last: {
            type: String,
            required: true
          }
        },
        company: String,
        _group: {
          default: "user",
          required: true,
          type: String,
          ref: 'Groups'
        },
        created: {
          type: Date,
          default: Date.now
        },
        updated: {
          type: Date,
          default: Date.now
        },
        random_string: String
      });

  Users.virtual('name.full').get(function() {
    return this.name.first + ' ' + this.name.last;
  });

  Users.virtual('password').get(function () {
    return this._password;
  }).set(function(password) {
    this._password = password;
    var salt = this.salt = bcrypt.gen_salt_sync(10);
    this.hash = bcrypt.encrypt_sync(password, salt);
  });

  Users.pre('save', function(next) {
    this.updated = Date.now();
    next();
  });

  Users.method('authenticate', function(password, callback) {
    bcrypt.compare(password, this.hash, callback);
  });

  Users.static('authenticate', exports.authenticate);
  Users.static('register', exports.register);
  Users.static('access', exports.access(db));
  Users.static('groupCount', exports.groupCount);
  return db.model('Users', Users);
};

exports.authenticate = function(login, password, callback) {
  var query = {};
  query.email = login;
  this
    .findOne(query)
    .populate('_group')
    .run(function(err, user) {
      if (err) return callback(err);
      if (!user) return callback('User with login ' + login + ' does not exist');
      user.authenticate(password, function (err, didSucceed) {
        if (err) {
          callback(err, null);
        } else {
          if (didSucceed) {
            return callback(null, user);
          } else {
            return callback('Password was entered incorrectly', null);
          }
        }
      });
    });
};

exports.register = function(params, callback) {
  this.create(params, function(err, user) {
    if (err) {
      return callback(err);
    }
    if (!user) {
      return callback('An error occured during registration', null);
    } else {
      return callback(null, user);
    }
    return callback(null, null);
  });
};

exports.groupCount = function(spec, cb) {
  this.count(spec, function(err, count) {
    if (err) console.log(err);
    var n = count;
    cb(err, n);
  });
};

exports.access = function(db) {
  return function(groupName) {
    return function(req, res, next) {
      if(req.loggedIn) {
        if(req.route.path === '/login') {
          if(req.session.redirectTo) {
            var redirectTo = req.session.redirectTo;
            delete req.session.redirectTo;
            res.redirect(redirectTo);
          } else {
            req.flash('notice', 'You are already logged in');
            res.redirect('/');
          }
        } else {
          if(typeof groupName === "undefined") {
            next();
          } else {
            var Users = require('../schemas/users')(db);
            Users
              .findById(req.session.auth._id)
              .populate('_group')
              .run(function (err, user) {
                if(err) {
                  req.flash('error', err);
                  return res.redirect('/');
                }
                if(user) {
                  if(typeof user._group !== 'undefined' && typeof user._group.id !== 'undefined') {
                    if(groupName instanceof Array) {
                      var _ = require('underscore');
                      if(_.indexOf(groupName, user._group.id) !== -1) {
                        next();
                        return;
                      }
                    } else {
                      if((groupName === user._group.id) || (groupName === "super_admin")) {
                        next();
                        return;
                      }
                    }
                  }
                  req.flash('error', 'Your group does not have permissions for this request');
                  res.redirect('/');
                } else {
                  req.flash('error', 'Your account is not currently accessible');
                  res.redirect('/logout');
                }
              });
          }
        }
      } else {
        if(req.route.path === '/login') {
          next();
        } else {
          req.session.redirectTo = req.route.path;
          res.redirect('/login');
        }
      }
    };
  };
};
