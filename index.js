#!/usr/bin/env node

const express = require("express");
const Repl = require("repl");

const fs = require("fs");
const net = require("net");
const http = require("http");
const https = require("https");

const port = process.env["PORT"] || 4000;

let app;
let repl;

const queue = [];
let current = null;

const helpers = {
  fs,
  net,
  http,
  https,
  status(code) {
    current.res.sendStatus(code);
  },
  header(name, value) {
    current.res.set(name, value);
  },
  // NOTE: does not currently work due to middleware being added after `app.all("*", ...`
  // static(directory = process.cwd()) {
  //   console.log(`Serving ${directory}`);
  //   app.use(express.static(directory));
  // },
};

const aliased = ["method", "url", "headers"];

function next() {
  if (!current) {
    current = queue.shift();
    if (current) {
      repl.context.req = current.req;
      repl.context.res = current.res;
      for (alias of aliased) {
        console.log(alias);
        repl.context[alias] = current.req[alias];
      }
      current.res.on("finish", finish);
    }
  }
  if (current) {
    repl.setPrompt(
      current.req.method +
        " " +
        current.req.url +
        (queue.length ? " (" + queue.length + ")" : "") +
        " > ",
    );
  } else {
    repl.setPrompt("> ");
  }
  repl.displayPrompt();
}

function finish() {
  current = null;
  repl.context.req = null;
  repl.context.res = null;
  repl.setPrompt("> ");
  repl.displayPrompt();
  next();
}

function startServer() {
  return new Promise(resolve => {
    app = express();
    app.all("*", (req, res) => {
      queue.push({ req, res });
      next();
    });
    app.listen(port, () => {
      console.log(`Listening on port ${port}.`);
      console.log(
        `Respond to requests by returning a value on the REPL, or using \`req\` and \`res\` objects.`,
      );
      resolve(app);
    });
  });
}

function startRepl() {
  return new Promise(resolve => {
    repl = Repl.start("> ").on("exit", () => {
      process.exit();
    });

    Object.assign(repl.context, helpers);

    const originalEval = repl.eval;
    repl.eval = function(...args) {
      originalEval(...args);
      const value = repl.context._;
      if (current && value !== undefined) {
        if (value >= 100 && value < 600) {
          current.res.sendStatus(value);
        } else if (isSendable(value, current.req)) {
          current.res.send(value);
        } else if (isPipeable(value)) {
          value.pipe(current.res);
        } else if (isPromise(value)) {
          value.then(value => {
            if (isSendable(value, current.req)) {
              current.res.send(value);
            }
          });
        }
      }
    };
    resolve();
  });
}

function start(args) {
  return startServer().then(() => startRepl());
}

function isSendable(value, req) {
  // exclude aliased reqeust properies
  for (alias of aliased) {
    if (value === req[alias]) {
      return false;
    }
  }
  return (
    // string
    typeof value === "string" ||
    // buffer
    Buffer.isBuffer(value) ||
    // null
    value === null ||
    // array
    Array.isArray(value) ||
    // object
    (value && value.constructor == Object)
  );
}

function isPipeable(value) {
  return value && typeof value.pipe === "function";
}

function isPromise(value) {
  return value && typeof value.then === "function";
}

if (require.main === module) {
  const [, , ...args] = process.argv;
  start(args);
}
