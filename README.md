This is a library that wraps the KIWI.KI Backend API in order to provide a simple JavaScript interface for Web Applications.

The goal of this library is to implement as much Business Logic as possible while not interacting with the DOM.
For an Application using the KiwiLib the Business Logic would ideally be all taken care by the KiwiLib.
In the MVC pattern, this corresponds to the KiwiLib implementing the Model and Controler and the Application making use of the KiwiLib would then only need to implement the View.

Since the KiwiLib doesn't know anything about the DOM, it can be used flexibly and it can be combined with frameworks like AngularJS, Backbone.js, or jQuery Mobile.


The Backend API root that the KiwiLib talks to is `egrep "^\s*ENDPOINT_ROOT = '(.+?)';$" src/config.js`.




[comment]: <> (this should be a comment and only visible in the source, github supports this trick and gitlab doesn't)
[comment]: <> (TOC works on github but not on gilab; github generates href links where gitlab doesn't)
**Table of Conent**
- [Code Explained](#code-explained)
- [Building & Serving](#building-serving)
- [Usage](#usage)
- [Git Remote Path Convention](#git-remote-path-convention)
- [License](#license)



## Code Explained
Because this KiwiLib is for now used exclusively by the KIWI.KI devs, this Code documentation is written in this README.


### Overall structure

The overall structure of the code can be seen into three different layers

#### Layer 1 [corresponds to src/endpoint.js]
This layer talks to the Backend API and is therefore the first layer.
This layer has three goals:
 - process the RESTful API
 - adapt the arguments sent to the Backend
 - adapt the results received from the Backend
 - save the Session Key and use it for every request sent
Therefore this layer keeps the overall Backend API structure.
A substantial amount of this layer could be replaced with a Framework. Intial research has not been conclusive to find an appropriate Framework.
Note that because the Session Key is saved, this layer does not keep the stateless property of REST.


#### Layer 2 [corresponds to src/api.js]
This layer builds upon the Layer 1.
The goal of the layer is to apadat the overall structure of the API logic.
E.g. squash two endpoint requests together.


#### Layer 3 [corresponds to src/kiwilib.js]
This layer builds upon the Layer 2.
This is the last layer and an Application using the KiwiLib will essentially use this layer.
The goal of this layer is to provide:
 - a bunch of arrays that are dynamically updated such that the data hold by these arrays is consistent with the data on the Backend (more precisely: an array is provided for every groups/singles of tag/sensor/user)
 - a bunch of functions defined as attributes of the objects in these arrays

Ideally this layer implements a broad number of functions such that for the purpose of altering data the Application just has to call functions of the objects in these arrays.
For the purpose of reading data, the Application just has to iterate over the arrays and read elements of the arrays.


#### Boilerplate
Additionaly the Library consists of:
 - a config file src/config.js
 - a file src/utils.js defining helper functions
 - a loader src/loader.js that loads the KiwiLib using `document.write("<script src="+url+"></script>")` (it has previously said that the KiwiLib is not aware of the DOM but as this point highlights the loader makes exception of this statement)


Therfore the Library consists of following source files
 - utils.js
 - config.js
 - endpoint.js
 - api.js
 - kiwilib.js


The general approach is that as much of the complexity and code as possible is pushed down the dependencies. E.g. endpoint.js should implement as much complexity as possible within its constraint of not changing the overall structure of the Backend endpoints.


### Dependencies

The dependencies are:
 - utils.js    requires nothing
 - config.js   requires [utils.js]
 - endpoint.js requires [utils.js, config.js]
 - api.js      requires [utils.js, endpoint.js]
 - kiwilib.js  requires [utils.js, config.js, api.js]
 - loaders.js  requires [utils.js, kiwilib.js]

The utils.js script defines an object on `window.utils`.
The other dependencies are implemented using the `window.utils.module` object defined in utils.js.
You can run `src$ fgrep window.utils.module.load * -R` to see the module dependencies.



## Building & Serving


### Build the code

Install Grunt CLI (task runner)

    $ apt-get install nodejs npm
    $ npm install -g grunt-cli

Install required grunt plugins listed in kiwilib/package.json

    $ cd kiwilib
    kiwilib$ npm install

Finally build the code

    kiwilib$ grunt build

The built KiwiLib code is then located in the `build/` directory.
The `build/kiwilib.js` file is a loader and the actually code is at `0.0.1/all.min.js`.
To use the KiwiLib built, simply load the loader. I.e. include `<script src="http://example.com/path/to/build/kiwilib.js>"`


### Serve the code

You can serve the KiwiLib either after or before the grunt build process.
Thefore on production you would use the built KiwiLib and while developing KiwiLib you would use the un-built KiwiLib.


#### Built
To serve the KiwiLib built serve the `build/` directory.
To then use the KiwiLib just load the `build/kiwiLib.js` file.


#### Un-built

To serve the KiwiLib un-built, serve the `src/` directory on (localhost|10.9.x.x):8000.
To then use the KiwiLib un-built load the `src/loader.js` file from (localhost|10.9.x.x):[1331,1338].
E.g.:
 - serve the KiwiLib `src/` directory on `http://localhost:8000`
 - serve the Web App wanting to use the un-built KiwiLib on `http://localhost:1337`
 - include `<script src="http://localhost:8000/loader.js">` in the Web App

All the code should then be loaded un-built.

### Change Backend API URL root

To change the API URL root the calls are made against to, change the following; 

    $ egrep "^\s*ENDPOINT_ROOT = '(.+?)';$" src/config.js



## Usage

The KiwiLib defines two global objects:
 - `window.kiwilib`
 - `window.utils`
Only `window.kiwilib` should be used.
`window.utils` is a an object holding a bunch of helper functions (you could actually use them, but it is not the purpose of the KiwiLib)


A usage documentation for `window.kiwilib` is not written yet and has to be written.

[comment]: <> (That said, a good start to see how to use `window.kiwilib` object, have a look at the minimalistic AngularJS view implementation that makes use of the KiwiLib at `https://github.com/KIWIKIGMBH/frontend-app-web`)



## Git Remote Path Convention
 - The path of every frontend project should be prefixed with `frontend`
 - The path of KiwiLib is `frontend-kiwilib.git`
 - The path of every Application should be prefixed with `frontend-app`. E.g. `frontend-app-web.git` , `frontend-app-instalator.git` , `frontend-app-support.git`.



## License
MPL2 license, see LICENSE file

