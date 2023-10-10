addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const key = url.pathname.split('/') //to split the URL path into multiple items within an array, separated by slash (/)
  if (key[1] == "secure") { //if the URL path starts with /secure, then do the following
    if (key[2] != null && key[2] != '') { //if the URL path has something after /secure/, do the following - return country flag image
      const countryFlagObject = await countryFlag.get(key[2].toLowerCase() + '.svg') //attempt to get the country flag asset
      if (countryFlagObject === null) {
        return new Response('Object Not Found', { //return 404 if the country flag asset does not exist in R2 bucket
          status: 404
        });
      }
      const headers = new Headers();
      countryFlagObject.writeHttpMetadata(headers);
      headers.set('etag', countryFlagObject.httpEtag);
      headers.set('content-type', 'image/svg+xml'); //specify appropriate content type for SVG

      return new Response(countryFlagObject.body, { //return the country flag asset back to the user
        headers,
      });
    } else { //else if the URL path is just /secure without anything else, then do the following - return CF Access authenticated user information
      let jwtinfo = await jwtPayload(request) //get the decoded JWT payload

      const regionNames = new Intl.DisplayNames( //initialize region name object for further reference of country full name
        ['en'], {
          type: 'region'
        }
      );

      const respheaders = new Headers()
      respheaders.set("content-type", "text/html"); //specify HTML content type

      const country = jwtinfo.payload.country.toString() //get the country code from the JWT payload
      const countryName = regionNames.of(jwtinfo.payload.country.toString()) //use the region name object, translate country code to name

      return new Response( //return CF Access authenticated user information, unix timestamp converted to a proper date for human to understand in UTC format
        jwtinfo.payload.email.toString() + " authenticated at " + new Date(parseInt(JSON.stringify(jwtinfo.payload.iat)) * 1000).toUTCString() + " from <a href=/secure/" + country + ">" + countryName + "</a>", {
          headers: respheaders
        }
      )
    }
  }
}

async function jwtPayload(request) {
  const encodedToken = getJwt(request);
  if (encodedToken === null) {
    return false
  }
  const token = decodeJwt(encodedToken);
  return token
}

function getJwt(request) {
  const authHeader = request.headers.get('Cf-Access-Jwt-Assertion'); //this req header contains the JWT token
  return authHeader
}

function decodeJwt(token) {
  const parts = token.split('.'); //there are different parts of information can be extracted from JWT token, hence need to split and specifically extract the JWT payload but not header and signature.
  const payload = JSON.parse(atob(parts[1]));
  return {
    payload: payload,
  }
}
