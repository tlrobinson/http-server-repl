# http-server-repl

A simple command-line webserver for responding to HTTP requests by typing JavaScript into a REPL.

Request:

- `req`: Express [Request](https://expressjs.com/en/api.html#req)
- `method`: HTTP request method
- `url`: HTTP request URL
- `headers`: HTTP request headers

Response:

- `res`: Express [Response](https://expressjs.com/en/api.html#req)
- evaluate REPL to a number to send a HTTP status code and no body
- evaluate REPL to an array, object, or null to send as JSON body
- evaluate REPL to a string, Buffer, or Stream to send as raw body
- `header`: set a HTTP response headers
- `status`: set a HTTP response status code
