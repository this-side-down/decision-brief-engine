/**
 * Registers the fixture raw-asset loader for Node/tsx eval CLIs.
 * Required on Node 20+ instead of relying on `--import` alone exporting hooks.
 */
import { register } from "node:module";

register("./register-fixture-raw-loader.mts", import.meta.url);
