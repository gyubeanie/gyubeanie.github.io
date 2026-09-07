import test from "node:test";
import assert from "node:assert/strict";
import { publishSnapshots, system, observationTime } from "./update-kpx-snapshots.mjs";
const now = Date.UTC(2026, 6, 22, 1, 10);
test("independent updates preserve the failed feed and publish the successful one", async () => {
  const writes = [];
  const updated = await publishSnapshots({ now, generationLoad: async () => ({ asOf: "2026-07-22 10:00" }),
    systemLoad: async () => { throw new Error("offline"); }, write: async (path, value) => writes.push({ path, value }) });
  assert.deepEqual(updated, ["data/kpx-live.json"]);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].value.payload.asOf, "2026-07-22 10:00");
});
test("stale or invalid observations never overwrite last-good snapshots", async () => {
  let writes = 0;
  await assert.rejects(publishSnapshots({ now, generationLoad: async () => ({ asOf: "2026-07-21 10:00" }),
    systemLoad: async () => ({ asOf: "2026-02-30 10:00" }), write: async () => { writes++; } }));
  assert.equal(writes, 0);
  assert.ok(Number.isNaN(observationTime("2026-02-30 10:00")));
});
test("system parser handles quoted timestamps, sorts and deduplicates observations", () => {
  const parsed = system(`<div id="avil">100000</div><div id="load">80000</div><div id="supPow">20000</div><div id="supPer">25</div>
    <script>const t_time=['20260722100000','20260722095500','20260722100000']; let x=[80000,79000,80000]; var v=[90000,89000,90000];</script>`);
  assert.equal(parsed.asOf, "20260722100000");
  assert.equal(parsed.demandHistory.length, 2);
  assert.equal(parsed.demandHistory[0].asOf, "20260722095500");
});
