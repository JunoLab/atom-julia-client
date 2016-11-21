'use babel';

import { client } from '../connection';

export function activate() {
  client.handle({
    profile(data) {
      console.log(data);
    }
  });
}
