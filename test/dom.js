// Installs a happy-dom window as the global DOM. Import this before react-dom,
// which checks for `window` and `document` when it loads.
import { Window } from "happy-dom";

const window = new Window();

globalThis.window = window;
globalThis.document = window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
