/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as audit from "../audit.js";
import type * as campaigns from "../campaigns.js";
import type * as companies from "../companies.js";
import type * as contacts from "../contacts.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as knowledgeBase from "../knowledgeBase.js";
import type * as leads from "../leads.js";
import type * as notifications from "../notifications.js";
import type * as onboarding from "../onboarding.js";
import type * as ransomHub from "../ransomHub.js";
import type * as ransomwareLiveApi from "../ransomwareLiveApi.js";
import type * as redrokApi from "../redrokApi.js";
import type * as rfpHub from "../rfpHub.js";
import type * as searches from "../searches.js";
import type * as tasks from "../tasks.js";
import type * as users from "../users.js";
import type * as watchlist from "../watchlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  audit: typeof audit;
  campaigns: typeof campaigns;
  companies: typeof companies;
  contacts: typeof contacts;
  events: typeof events;
  http: typeof http;
  knowledgeBase: typeof knowledgeBase;
  leads: typeof leads;
  notifications: typeof notifications;
  onboarding: typeof onboarding;
  ransomHub: typeof ransomHub;
  ransomwareLiveApi: typeof ransomwareLiveApi;
  redrokApi: typeof redrokApi;
  rfpHub: typeof rfpHub;
  searches: typeof searches;
  tasks: typeof tasks;
  users: typeof users;
  watchlist: typeof watchlist;
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
