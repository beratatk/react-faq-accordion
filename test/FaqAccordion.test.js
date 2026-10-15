import "./dom.js";
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { act, createElement as h, StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { FaqAccordion } from "../dist/index.js";

const items = [
  { question: "Question 1", answer: "Answer 1" },
  { question: "Question 2", answer: "Answer 2" },
  { question: "Question 3", answer: "Answer 3" },
];

after(() => window.happyDOM.close());

// Mounts inside StrictMode, as most apps run in development. React then calls
// state updaters twice, which is how a side effect in an updater shows up.
async function mount(t, element) {
  const errors = [];
  t.mock.method(console, "error", (...args) => errors.push(args.join(" ")));

  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(h(StrictMode, null, element)));
  t.after(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const summaries = [...container.querySelectorAll("summary")];
  return {
    container,
    errors,
    // Clicks passed together land in the same React batch.
    click: (...indexes) =>
      act(async () => {
        for (const index of indexes) summaries[index].click();
      }),
    // Reads data-state, which React renders, rather than details.open:
    // happy-dom toggles <details> on a summary click before React's root
    // listener can cancel it, unlike browsers.
    openIndexes: () =>
      [...container.querySelectorAll("details")].flatMap((details, index) =>
        details.getAttribute("data-state") === "open" ? [index] : []
      ),
  };
}

// duration: 0 makes open and close synchronous.
async function render(t, props = {}) {
  const calls = [];
  const onToggle = (index, open) => calls.push([index, open]);
  const view = await mount(t, h(FaqAccordion, { items, duration: 0, onToggle, ...props }));
  return { ...view, calls };
}

test("onToggle fires once per click in StrictMode", async (t) => {
  const view = await render(t);

  await view.click(0);
  assert.deepEqual(view.calls, [[0, true]]);

  await view.click(0);
  assert.deepEqual(view.calls, [[0, true], [0, false]]);
  assert.deepEqual(view.errors, []);
});

test("onToggle can update the parent's state", async (t) => {
  function Parent() {
    const [log, setLog] = useState([]);
    return h(
      "div",
      null,
      h(FaqAccordion, {
        items,
        duration: 0,
        onToggle: (index, open) => setLog((current) => [...current, `${index}:${open}`]),
      }),
      h("output", null, log.join(" "))
    );
  }
  const view = await mount(t, h(Parent));

  await view.click(1);
  assert.equal(view.container.querySelector("output").textContent, "1:true");
  assert.deepEqual(view.errors, []);
});

test("without allowMultiple, opening an item closes the open one", async (t) => {
  const view = await render(t);

  await view.click(0);
  await view.click(1);
  assert.deepEqual(view.openIndexes(), [1]);
  // The item that closed as a side effect doesn't get its own call.
  assert.deepEqual(view.calls, [[0, true], [1, true]]);
  assert.deepEqual(view.errors, []);
});

test("allowMultiple keeps several items open", async (t) => {
  const view = await render(t, { allowMultiple: true });

  await view.click(0);
  await view.click(2);
  assert.deepEqual(view.openIndexes(), [0, 2]);

  await view.click(0);
  assert.deepEqual(view.openIndexes(), [2]);
  assert.deepEqual(view.calls, [[0, true], [2, true], [0, false]]);
  assert.deepEqual(view.errors, []);
});

test("defaultOpen opens items on first render and in the server HTML", async (t) => {
  const html = renderToString(
    h(FaqAccordion, { items, allowMultiple: true, defaultOpen: [0, 2] })
  );
  assert.equal(html.match(/<details[^>]*\sopen=""/g)?.length, 2);

  const view = await render(t, { defaultOpen: 1 });
  assert.deepEqual(view.openIndexes(), [1]);

  await view.click(1);
  assert.deepEqual(view.openIndexes(), []);
  assert.deepEqual(view.calls, [[1, false]]);
  assert.deepEqual(view.errors, []);
});

test("clicks in the same batch build on each other", async (t) => {
  const view = await render(t, { allowMultiple: true });

  await view.click(0, 1);
  assert.deepEqual(view.openIndexes(), [0, 1]);

  await view.click(2, 2);
  assert.deepEqual(view.openIndexes(), [0, 1]);
  assert.deepEqual(view.calls, [[0, true], [1, true], [2, true], [2, false]]);
  assert.deepEqual(view.errors, []);
});
