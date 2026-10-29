// Mirrors iab-vast-loader@2.5.1/node.js without the `esm` loader, which fails on Node >= 22.
import nodeFetch from 'node-fetch';
import { VASTLoader } from 'iab-vast-loader/lib/loader';
import { VASTLoaderError } from 'iab-vast-loader/lib/loader-error';
import { HTTPError } from 'iab-vast-loader/lib/http-error';
import { atob } from 'iab-vast-loader/lib/node/atob';
VASTLoader.fetch = nodeFetch;
VASTLoader.atob = atob;
export { VASTLoader, VASTLoaderError, HTTPError };
