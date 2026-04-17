module.exports = {
  extends: "universe/native",
  env: {
    browser: true,
    node: true,
  },
  globals: {
    URLSearchParams: "readonly",
    BroadcastChannel: "readonly",
    faceapi: "readonly",
    btoa: "writable",
    atob: "writable",
    __DEV__: "readonly",
  },
};
