import { Context } from "effect";

import type { ActionCtx, DatabaseWriter } from "./_generated/server";

export class ConvexDatabase extends Context.Tag("ConvexDatabase")<ConvexDatabase, DatabaseWriter>() {}

export class ConvexStorage extends Context.Tag("ConvexStorage")<ConvexStorage, ActionCtx["storage"]>() {}
