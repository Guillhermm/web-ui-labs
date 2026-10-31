import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

// Only the vortex is meant to show up in search; everything else stays out.
const indexed = ["navier-stokes-vortex"];
const hidden = ["calculator", "chess-opera-game-animation", "houdini-chromatic-wheel", "prime-binary-display", "primes"];

test("indexed pages carry no robots noindex", async () => {
	for (const page of indexed) {
		assert.doesNotMatch(await read(`${page}/index.html`), /name="robots"/, page);
	}
});

test("hidden pages are noindex", async () => {
	for (const page of hidden) {
		assert.match(await read(`${page}/index.html`), /<meta name="robots" content="noindex">/, page);
	}
});

test("hub is noindex but still followed", async () => {
	assert.match(await read("index.html"), /<meta name="robots" content="noindex, follow">/);
});

test("sitemap lists exactly the indexed pages", async () => {
	const locs = [...(await read("sitemap.xml")).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
	assert.deepEqual(locs, indexed.map((page) => `https://guillhermm.github.io/web-ui-labs/${page}/`));
});
