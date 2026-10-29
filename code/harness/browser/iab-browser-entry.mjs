// iab-vast-loader's own browser entry (unfetch over XMLHttpRequest; iab-vast-parser's browser build with the native
// DOMParser). Swapped in for build/dist/iab-vast-loader.bundle.mjs at bundle time.
export { VASTLoader, VASTLoaderError, HTTPError } from 'iab-vast-loader/browser.js';
