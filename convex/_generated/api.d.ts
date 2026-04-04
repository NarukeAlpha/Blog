/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as api_ from "../api.js";
import type * as bookmarkInternals from "../bookmarkInternals.js";
import type * as bookmarks from "../bookmarks.js";
import type * as http from "../http.js";
import type * as posts from "../posts.js";
import type * as public_ from "../public.js";
import type * as publicBookmarks from "../publicBookmarks.js";
import type * as site from "../site.js";
import type * as studioAuth from "../studioAuth.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  api: typeof api_;
  bookmarkInternals: typeof bookmarkInternals;
  bookmarks: typeof bookmarks;
  http: typeof http;
  posts: typeof posts;
  public: typeof public_;
  publicBookmarks: typeof publicBookmarks;
  site: typeof site;
  studioAuth: typeof studioAuth;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
