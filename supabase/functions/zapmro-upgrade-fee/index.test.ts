import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("checkout item uses InfinitePay description field", async () => {
  const source = await Deno.readTextFile(new URL("./index.ts", import.meta.url));

  assertEquals(
    source.includes("const lineItems = [{ description, quantity: 1, price: priceCents }]") ,
    true,
  );
  assertEquals(source.includes("const lineItems = [{ name: description"), false);
});

Deno.test("webhook confirmation does not write an unavailable payload column", async () => {
  const webhookSource = await Deno.readTextFile(
    new URL("../infinitepay-webhook/index.ts", import.meta.url),
  );

  assertEquals(webhookSource.includes("payload: body"), false);
  assertEquals(webhookSource.includes("paymentVerification.paid"), true);
});