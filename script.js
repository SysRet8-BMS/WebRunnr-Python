const outputEl = document.getElementById("output");
const codeEl = document.getElementById("code");
const runBtn = document.getElementById("run-button");

function addToOutput(s) {
    outputEl.value += s + "\n";
}

outputEl.value = "Initializing...\n";

let pyodideReadyPromise = loadPyodide().then(async (pyodide) => {
    // Redirect stdout/stderr
    pyodide.setStdout({
        batched: (s) => addToOutput(s)
    });
    pyodide.setStderr({
        batched: (s) => addToOutput("Error: " + s)
    });

    // Override prompt() for input()
    pyodide.globals.set("js_prompt", window.prompt.bind(window));
    pyodide.runPythonAsync(`
    import builtins
    builtins.input = lambda prompt='': js_prompt(prompt)
  `);

    // Multithreading support using JS web workers
    self.onmessage = async(event_obj) => {
        const {codeEl} = event_obj.data;
        importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");
        const pyodide = await loadPyodide();
        try {
            const result = await pyodide.runPythonAsync(codeEl);
            self.postMessage({result});
        } catch(err) {
            self.postMessage({error: err.message})
        }
    };
    
    addToOutput("Ready!");
    return pyodide;
});

runBtn.addEventListener("click", async () => {
    let pyodide = await pyodideReadyPromise;
    try {
        await pyodide.runPythonAsync(codeEl.value);
    } catch (err) {
        addToOutput("Error: " + err);
    }
});
