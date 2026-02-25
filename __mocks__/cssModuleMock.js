// cssModuleMock.js
// This mock handles both `import styles from '...'` and `import * as styles from '...'`
// by creating a Proxy that returns the property key as its own value AND sets __esModule=true
// so ts-jest's interopRequireWildcard passes it through directly.

const handler = {
  get: function getter(target, key) {
    if (key === '__esModule') {
      return true;
    }
    if (key === 'default') {
      return new Proxy({}, handler);
    }
    return key;
  },
};

module.exports = new Proxy({}, handler);
