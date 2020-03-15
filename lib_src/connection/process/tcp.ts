/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import net from 'net';
import client from '../client';

export default {
  server: null,
  port: null,

  listeners: [],

  next() {
    const conn = new Promise(resolve => {
      return this.listeners.push(resolve);
    });
    conn.dispose = () => {
      return this.listeners = this.listeners.filter(x => x === conn);
    };
    return conn;
  },

  connect(sock) {
    const message = m => sock.write(JSON.stringify(m));
    client.readStream(sock);
    sock.on('end', () => client.detach());
    sock.on('error', () => client.detach());
    return client.attach({message});
  },

  handle(sock) {
    if (this.listeners.length > 0) {
      return this.listeners.shift()(sock);
    } else if (!client.isActive()) {
      return this.connect(sock);
    } else {
      return sock.end();
    }
  },

  listen() {
    if (this.port != null) { return Promise.resolve(this.port); }
    return new Promise((resolve, reject) => {
      let port;
      const externalPort = atom.config.get('julia-client.juliaOptions.externalProcessPort');
      if (externalPort === 'random') {
        port = 0;
      } else {
        port = parseInt(externalPort);
      }
      this.server = net.createServer(sock => this.handle(sock));
      this.server.on('error', err => {
        if (err.code === 'EADDRINUSE') {
          let details = '';
          if (port !== 0) {
            details = 'Please change to another port in the settings and try again.';
          }
          atom.notifications.addError("Julia could not be started.", {
            description: `\
Port \`${port}\` is already in use.
\
` + (details !== '' ?
              `\
${details}\
`
            :
              "Please try again or set a fixed port that you know is unused."),
            dismissable: true
          }
          );
        }
        return reject(err);
      });
      return this.server.listen(port, '127.0.0.1', () => {
        this.port = this.server.address().port;
        return resolve(this.port);
      });
    });
  }
};
