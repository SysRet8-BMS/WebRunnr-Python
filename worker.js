import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.mjs";

const inputPromise = {};

async function async_input(prompt) {
  self.postMessage({ type: 'input_request', prompt });
  return new Promise((resolve) => {
    inputPromise.resolve = resolve;
  });
}

async function setupPyodide() {
  // ** ADDED TRY...CATCH TO FIND THE STARTUP ERROR **
  try {
    const pyodide = await loadPyodide();
    
    pyodide.setStdout({ batched: (s) => self.postMessage({ type: 'stdout', data: s }) });
    pyodide.setStderr({ batched: (s) => self.postMessage({ type: 'stderr', data: s + "\n" }) });
    pyodide.globals.set("async_input", async_input);
    
    // This message will only be sent if setup is successful
    self.postMessage({ type: 'ready' });
    return pyodide;

  } catch (error) {
    // If an error happens during startup, send it to the main thread for display
    self.postMessage({ type: 'error', data: "Failed to load Pyodide. Error: " + error.message });
  }
}

const pyodideReadyPromise = setupPyodide();

self.onmessage = async (event) => {
    // ... (the rest of this function remains exactly the same)
    if (event.data.type === 'input_response') {
        if (inputPromise.resolve) {
            inputPromise.resolve(event.data.value);
            delete inputPromise.resolve;
        }
        return;
    }
    
    const pyodide = await pyodideReadyPromise;
    // If pyodide failed to load, it will be undefined.
    if (!pyodide) {
        self.postMessage({ type: 'error', data: "Pyodide is not loaded. Cannot run code." });
        return;
    }

    const { pythonCode } = event.data;

    try {
        await pyodide.loadPackagesFromImports(pythonCode);
        let wrappedCode = `
import asyncio

async def main():
    ${pythonCode.replace(/\n/g, '\n    ')}

await main()
`;
        await pyodide.runPythonAsync(wrappedCode);
        self.postMessage({ type: 'done' });
    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};