export default function monkeyPatch(router, zeroframe) {
  // TODO: Remove original event listener

  // We only send the path after /? to vue-router. The set base path is ignored.
  function getLocation(loc = window.location) {
    // Ignore ? prefix that gets set by ZeroFrame's wrapperPushState
    return (loc.search.slice(1)
       // Ignore wrapper and wrapper_nonce params set by ZeroFrame's iframe
      .replace(/[&?]wrapper=False/, "")
      .replace(/[&?]wrapper_nonce=[A-Za-z0-9]+/, "")
      || '/') + loc.hash
  }

  // Subscribe to history change events
  function listenToZeroFrame() {
    zeroframe.route = function (cmd, msg) {
      if (cmd === "wrapperPopState") {
        // Create dummy element to provide search and hash attributes
        let a = document.createElement('a')
        a.href = msg.params.href
        router.history.transitionTo(getLocation(a), route => {/* TODO: handle scroll*/ })
      } else {
        Object.getPrototypeOf(zeroframe).route.call(zeroframe, cmd, msg)
      }
    }
  }

  listenToZeroFrame()

  let _key = genKey()

  function genKey() {
    return Date.now().toFixed(3)
  }

  function cleanPath(path) {
    return path.replace(/\/\//g, '/')
  }

  router.history.push = (location, onComplete, onAbort) => {
    router.history.transitionTo(location, route => {
      _key = genKey()
      zeroframe.cmd("wrapperPushState", [{ key: _key }, '', cleanPath(router.history.base + route.fullPath)])
      // TODO: Handle scroll
      onComplete && onComplete(route)
    }, onAbort)
  }

  router.history.replace = (location, onComplete, onAbort) => {
    router.history.transitionTo(location, route => {
      zeroframe.cmd("wrapperReplaceState", [{ key: _key }, '', cleanPath(router.history.base + route.fullPath)])
      // TODO: Handle  scroll
      onComplete && onComplete(route)
    }, onAbort)
  }

  router.history.ensureURL = (push) => {
    if (getLocation() !== location.current.fullPath) {
      const current = cleanPath(window.location + router.history.current.fullPath)
      push ? router.history.pushState(current) : router.history.replaceState(current)
    }
  }

  // We only send the path after /? to vue-router. The set base path is ignored.
  router.history.getCurrentLocation = () => getLocation()

  router.history.go = n => console.exception("[vue-zeronet] router.history.go not implemented")
}
