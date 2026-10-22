import { JSDOM } from "jsdom";

// react-dom checks for a DOM when it loads, so tests import this before it.
export const dom = new JSDOM("<!doctype html><body></body>");
Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
// jsdom doesn't implement scrolling.
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
