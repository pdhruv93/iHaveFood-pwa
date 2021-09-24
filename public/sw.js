/*Names of static and Dynmaic caches*/
const staticCacheName = 'site-static-v1';
const dynamicCacheName = 'site-dynamic-v1';

/*Names of static or shell assets that will be cached*/
const assets = [
  '/',
  '/index.html',
  '/js/scripts.js',
  '/css/styles.css',
  '/img/1.jpeg', '/img/2.jpeg', '/img/default.jpg',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.gstatic.com/s/materialicons/v103/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2',
  'https://fonts.googleapis.com/css2?family=Oswald:wght@500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css',
  'https://code.jquery.com/jquery-3.6.0.min.js',
  '/404.html'
];


/*Max number of keys that are allowed to be stored in a particular cache*/
const limitCacheSize = (name, maxNumberOfKeys) => {
  caches.open(name).then(cache => {
    cache.keys().then(keys => {
      if(keys.length > maxNumberOfKeys){
        cache.delete(keys[0]).then(limitCacheSize(name, maxNumberOfKeys));
      }
    });
  });
};


/*LIFECYLCE OF SERVICE WORKER:
Register-->Install--->Activate
Registration happens after evry browser reload. 
Install happens only when serviceWorker.js contents are changed(To make this change we change version name of caches).
Activation occurs when the browser is opened next time. Untill that current serviceWorker runs.
*/

/*Service Worker Install event
Store all the static assets(or shell assets) into static cache.
waitUntil doesnt lets activate event finish untill all the static assets have been cached
*/
self.addEventListener('install', evt => {
  console.log('Service Worker installed');
  evt.waitUntil(
    caches.open(staticCacheName).then((cache) => {
      console.log('caching shell assets');
      cache.addAll(assets);
    })
  );
});


/*Service Worker Activate event
Deleting all the old entries of the static and dynamic cache
*/
self.addEventListener('activate', evt => {
  console.log('Service Worker activated');
  evt.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys
        .filter(key => key !== staticCacheName && key !== dynamicCacheName)
        .map(key => caches.delete(key))
      );
    })
  );
});


/*Service Worker Fetch Event: Most important Logic or so called heart of Service Worker
Everything working on a browser is a fetch event. Even when you do img src="./img/1.jpeg", 
it generates fetch event to fetch image from local.
The service worker intercepts all the fetch requests and decides whether the resource could be served from local cache,
otherwise a server hit is made to fetch the resource.
*/
self.addEventListener('fetch', evt => {
  if(evt.request.url.indexOf('firestore.googleapis.com') === -1)   
  //we dont want to intercept DB requests as firestore is already handling that(-1 means does not contains)
  {
    evt.respondWith(
      //caches.match matches the request URL or the KEY(evt.request) in all of our caches. 
      //In case of failure it returns empty cacheRes. In case of success it returns non-empty cacheRes
      caches.match(evt.request).then(cacheRes => {
        //If cacheRes is not empty(success) return it as it is.
        //In failure case do a fresh fetch on the same request because the resource could not be found in cache.
        return cacheRes || fetch(evt.request).then(fetchRes => {
          //Store the fresh response in Dynamic cache. Static cache is always filled during install event 
          return caches.open(dynamicCacheName).then(cache => {
            //once the dynamic cache is opened then store the fresh response in cache(key, value) format
            //.clone() is used beacause once the response is consumed, browser deletes it and cannot be accessed later
            cache.put(evt.request.url, fetchRes.clone());
            //Once the new response has been added to dynamic cache, ensure that the size is limited
            limitCacheSize(dynamicCacheName, 15);
            return fetchRes;
          })
        });
      })
      .catch(() => {
        if(evt.request.url.indexOf('.html') > -1)
        {
          //if there were some error in any of the fetch event and the resource type is of .html, show 404.html page
          //we dont want to show 404.html page in case of errors fetching image files
          return caches.match('./404.html');
        } 
      })
    );
  }
});