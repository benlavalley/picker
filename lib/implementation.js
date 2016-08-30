var pathToRegexp = Npm.require('path-to-regexp');
var Fiber = Npm.require('fibers');
var urlParse = Npm.require('url').parse;

PickerImp = function(filterFunction) {
  this.filterFunction = filterFunction;
  this.routes = [];
  this.options = {};
  this.allOptions = {}; // same as above, but also include options inherited from higher level router groups
  this.subRouters = [];
  this.middlewares = [];
  this.parentRouter = null;
  this.name = 'root';
};

PickerImp.prototype.middleware = function(callback) {
  this.middlewares.push(callback);
  for (const subRouter of this.subRouters) {
    subRouter.middleware(callback);
  }
};

PickerImp.prototype.route = function(path, callback) {
  var regExp = pathToRegexp(path);
  this._route(regExp, callback, this);
  return this;
};

PickerImp.prototype.setOptions = function(options = {}) {
  this.options = options;
  this._updateOptions();
};

PickerImp.prototype._updateOptions = function() {
  if (this.parentRouter) {
    this.allOptions = { ...this.parentRouter.allOptions, ...this.options };
  } else {
    this.allOptions = this.options;
  }
  for (const subRouter of this.subRouters) {
    subRouter._updateOptions();
  }
};

PickerImp.prototype._route = function(regExp, callback, routerManagingRoute) {
  // only the top parent router manages the route order
  // to avoid concurency between subrouters
  if (this.parentRouter) {
    this.parentRouter._route(regExp, callback, routerManagingRoute);
  } else {
    this.routes.push({
      regex: regExp,
      callback,
      router: routerManagingRoute,
    });
  }
};

PickerImp.prototype.filter = function(callback) {
  return this.SubRouter({ filter: callback, name: 'anonymous-subRouter' });
};

PickerImp.prototype.SubRouter = function({ filter, name, options } = {}) {
  var subRouter = new PickerImp(filter);
  subRouter.name = name;
  this.subRouters.push(subRouter);
  for(const middleware of this.middlewares) {
    subRouter.middleware(middleware);
  }
  subRouter.parentRouter = this;
  subRouter.setOptions(options)
  return subRouter;
};

PickerImp.prototype._dispatch = function(req, res, bypass) {
  var self = this;
  var currentRoute = 0;

  function processNextRoute () {
    var route = self.routes[currentRoute++];
    if (route) {
      var uri = req.url.replace(/\?.*/, '');
      var m = uri.match(route.regex);
      if (m) {
        var router = route.router;
        if (router.allOptions.debug) {
          console.log('Picker route hit:', req.method, req.url);
        }
        if (!router.filterFunction || router.filterFunction(req, res)) {
          router._processMiddlewares(req, res, () => {
            var params = router._buildParams(route.regex.keys, m);
            params.query = urlParse(req.url, true).query;
            router._processRoute(route.callback, params, req, res, bypass);
          });
          return;
        }
      }
      processNextRoute();
    } else {
      bypass();
    }
  }
  processNextRoute();
};

PickerImp.prototype._buildParams = function(keys, m) {
  var params = {};
  for(var lc=1; lc<m.length; lc++) {
    var key = keys[lc-1].name;
    var value = m[lc];
    params[key] = value;
  }

  return params;
};

PickerImp.prototype._processRoute = function(callback, params, req, res, next) {
  if(Fiber.current) {
    doCall();
  } else {
    new Fiber(doCall).run();
  }

  function doCall () {
    callback.call(null, params, req, res, next); 
  }
};

PickerImp.prototype._processMiddlewares = function(req, res, next) {
  var self = this;
  var currentMiddleware = 0;

  function processNextMiddleware (onDone) {
    var middleware = self.middlewares[currentMiddleware++];
    if(middleware) {
      self._processMiddleware(middleware, req, res, () => { processNextMiddleware(onDone); });
    } else {
      onDone();
    }
  }
  processNextMiddleware(next);
};

PickerImp.prototype._processMiddleware = function(middleware, req, res, next) {
  if(Fiber.current) {
    doCall();
  } else {
    new Fiber(doCall).run();
  }

  function doCall() {
    middleware.call(null, req, res, next);
  }
};

PickerImp.prototype.getName = function() {
  if (this.parentRouter) {
    return this.parentRouter.getName() + '.' + this.name;
  }
  return this.name;
};
