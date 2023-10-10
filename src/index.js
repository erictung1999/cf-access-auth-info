addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const key = url.pathname.split('/')
  if (key[1] == "secure") {
    if (key[2] != null && key[2] != '') {
      const countryFlagObject = await countryFlag.get(key[2].toLowerCase() + '.svg')
      if (countryFlagObject === null) {
        return new Response('Object Not Found', {
          status: 404
        });
      }
      const headers = new Headers();
      countryFlagObject.writeHttpMetadata(headers);
      headers.set('etag', countryFlagObject.httpEtag);
      headers.set('content-type', 'image/svg+xml');

      return new Response(countryFlagObject.body, {
        headers,
      });
    } else {
      let jwtinfo = await isValidJwt(request)

      const regionNames = new Intl.DisplayNames(
        ['en'], {
          type: 'region'
        }
      );

      const respheaders = new Headers()
      respheaders.set("content-type", "text/html");

      const country = jwtinfo.payload.country.toString()
      const countryName = regionNames.of(jwtinfo.payload.country.toString())

      return new Response(
        jwtinfo.payload.email.toString() + " authenticated at " + new Date(parseInt(JSON.stringify(jwtinfo.payload.iat)) * 1000).toUTCString() + " from <a href=/secure/" + country + ">" + countryName + "</a>", {
          headers: respheaders
        }
      )
    }
  }
}

async function isValidJwt(request) {
  const encodedToken = getJwt(request);
  if (encodedToken === null) {
    return false
  }
  const token = decodeJwt(encodedToken);
  return token
}

function getJwt(request) {
  const authHeader = request.headers.get('Cf-Access-Jwt-Assertion');
  return authHeader
}

function decodeJwt(token) {
  const parts = token.split('.');
  const header = JSON.parse(atob(parts[0]));
  const payload = JSON.parse(atob(parts[1]));
  const signature = atob(parts[2].replace(/_/g, '/').replace(/-/g, '+'));
  console.log(header)
  return {
    header: header,
    payload: payload,
    signature: signature,
    raw: {
      header: parts[0],
      payload: parts[1],
      signature: parts[2]
    }
  }
}
