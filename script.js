const codeEl = document.getElementById('code');
const outputEl = document.getElementById('output');
const runBtn = document.getElementById('run-button');

const pyodideWorker = new Worker('./worker.js', { type: 'module' });

pyodideWorker.onmessage = (event) => {
    const { type, data, prompt } = event.data;

    switch (type) {
        case 'input_request':
            const userInput = window.prompt(prompt);
            pyodideWorker.postMessage({ type: 'input_response', value: userInput });
            break;

        case 'stdout':
        case 'stderr':
            outputEl.value += data;
            outputEl.scrollTop = outputEl.scrollHeight; // Auto-scroll
            break;

        case 'ready':
            runBtn.disabled = false;
            runBtn.textContent = 'Run Code';
            break;

        case 'done':
            outputEl.value += '\n\n✅ Script Finished.';
            runBtn.disabled = false;
            runBtn.textContent = 'Run Code';
            outputEl.scrollTop = outputEl.scrollHeight;
            break;
            
        case 'error':
            outputEl.value += `\n\n❌ PYTHON ERROR: ${data}`;
            runBtn.disabled = false;
            runBtn.textContent = 'Run Code';
            outputEl.scrollTop = outputEl.scrollHeight;
            break;
    }
};

runBtn.addEventListener('click', () => {
    runBtn.disabled = true;
    runBtn.textContent = 'Running...';
    outputEl.value = ''; // Clear previous output

    const originalCode = codeEl.value;
    const modifiedCode = originalCode.replace(/\binput\s*\(/g, "await async_input(");

    pyodideWorker.postMessage({ pythonCode: modifiedCode });
});