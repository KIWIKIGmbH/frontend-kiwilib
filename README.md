# KiwiLib

This is a library that wraps the KIWI.KI Backend API in order to provide a simple JavaScript interface for Web Applications.
Ideally for an Application using the KiwiLib all the Buniness Logic would be taken care by the KiwiLib.

The Kiwilib talks to `egrep "^\s*ENDPOINT_ROOT = '(.+?)';$" src/config.js`

The KiwiLib doesn't know anything about the DOM. Therefore the KiwiLib can be combined with frameworks like AngularJS, Backbone.js, or jQuery Mobile.

The KiwiLib defines two global objects:
 - `window.kiwilib`
 - `window.utils`
Only `window.kiwilib` should be used.
`window.utils` is a an object holding a bunch of helper functions (you could actually use them, but it isn't the purpose of the Kiwilib)



## License
MPL2 license, see LICENSE file



## Building & Serving
For building and serving the KiwiLib see https://dokuwiki.doorfid.com/dokuwiki/engineering:frontend:install



## Path convention for GIT remotes
 - The path of every frontend project should be prefixed with `frontend`
 - The path of KiwiLib is `frontend-kiwilib.git`
 - The path of every Application should be prefixed with `frontend-app`. E.g. `frontend-app-web.git` , `frontend-app-instalator.git` , `frontend-app-support.git`.



## Code related documentation
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
Note that because the Session Key is saved, this layer does not keep the stateless property of REST


#### Layer 2 [corresponds to src/api.js]
This layer builds upon the Layer 1.
The goal of the layer is to apadat the overall structure of the API logic. E.g. squash two endpoint requests together.


#### Layer 3 [corresponds to src/kiwilib.js]
This layer builds upon the Layer 2.
This is the last layer and an Application using the KiwiLib will essentially use this layer.
The goal of this layer is to provide:
 - a bunch of arrays that are dynamically updated such that the data hold by these arrays are consistent with the data on the Backend (specifically an array for every groups/singles of tag/sensor/user)
 - a bunch of functions defined as attributes of the objects in these arrays

Ideally this layer implements a broad number of functions such that for the purpose of altering data the Application just has to call functions of the objects of these arrays. And for the purpose of reading data, the Application just has to iterate over the arrays and read elements of the arrays.


Additionaly the Libray consists of:
 - a config file src/config.js
 - a file defining helper functions src/utils.js
 - a KiwiLib loader src/loader.js that asynchronously loads the KiwiLib.


Therfore the Library consists of following source files
 - utils.js
 - config.js
 - endpoint.js
 - api.js
 - kiwilib.js
 - loader.js


The general approach is that as much of the complexity and code as possible is pushed down the dependencies. E.g. endpoint.js should implement as much complexity as possible within its constraint of not changing the overall structure of the Backend endpoints.



### Dependencies

The dependencies are:
 - utils.js    requires nothing
 - config.js   requires [utils.js]
 - endpoint.js requires [utils.js, config.js]
 - api.js      requires [utils.js, endpoint.js]
 - kiwilib.js  requires [utils.js, config.js, api.js]
 - loaders.js  requires [utils.js, kiwilib.js]

The utils.js file defines a utils object on the window object.
The other dependencies are implemented using the `utils.module` object defined in utils.js
You can run `src$ fgrep utils.module.load * -R` to see the module dependencies

