/**
 * Script Loader Helper
 * This file helps manage the loading order of JavaScript files
 * Version: 1.0.0
 */

console.log("Script Loader Helper initialized");

// Check if a script is loaded
function isScriptLoaded(scriptName) {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].src.includes(scriptName)) {
            return true;
        }
    }
    return false;
}

// Load a script if it's not already loaded
function loadScriptIfNeeded(scriptUrl, dependencies = [], onLoadCallback = null) {
    // Extract script name from URL for logging and checking
    const scriptName = scriptUrl.split('/').pop();
    
    console.log(`Checking if ${scriptName} is loaded...`);
    
    // If the script is already loaded, just call the callback
    if (isScriptLoaded(scriptName)) {
        console.log(`${scriptName} is already loaded.`);
        if (onLoadCallback) onLoadCallback();
        return;
    }
    
    // Check if dependencies are loaded
    const missingDependencies = dependencies.filter(dep => !isScriptLoaded(dep));
    if (missingDependencies.length > 0) {
        console.warn(`Cannot load ${scriptName} because these dependencies are missing: ${missingDependencies.join(', ')}`);
        // Try to load missing dependencies recursively
        missingDependencies.forEach(dep => {
            const depUrl = `./assets/js/${dep}`;
            loadScriptIfNeeded(depUrl, [], () => {
                // After dependency is loaded, try loading the original script again
                loadScriptIfNeeded(scriptUrl, dependencies.filter(d => d !== dep), onLoadCallback);
            });
        });
        return;
    }
    
    // Create and append the script element
    console.log(`Loading ${scriptName}...`);
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = scriptUrl;
    script.onload = function() {
        console.log(`${scriptName} loaded successfully.`);
        if (onLoadCallback) onLoadCallback();
    };
    script.onerror = function() {
        console.error(`Failed to load ${scriptName}.`);
    };
    document.body.appendChild(script);
}

// Check the loading order of pagination-helper.js and seller.js
function checkPaginationScriptOrder() {
    const sellerJsLoaded = isScriptLoaded('seller.js');
    const paginationHelperLoaded = isScriptLoaded('pagination-helper.js');
    
    console.log(`Script loading status - seller.js: ${sellerJsLoaded ? 'Loaded' : 'Not loaded'}, pagination-helper.js: ${paginationHelperLoaded ? 'Loaded' : 'Not loaded'}`);
    
    // If pagination-helper is loaded but seller.js isn't, we have a problem
    if (paginationHelperLoaded && !sellerJsLoaded) {
        console.warn('pagination-helper.js is loaded before seller.js. This may cause pagination issues.');
        // Load seller.js and then reload pagination-helper.js
        loadScriptIfNeeded('./assets/js/seller.js', [], function() {
            // Remove the existing pagination-helper script
            const scripts = document.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
                if (scripts[i].src.includes('pagination-helper.js')) {
                    scripts[i].parentNode.removeChild(scripts[i]);
                    break;
                }
            }
            // Load pagination-helper again
            loadScriptIfNeeded('./assets/js/pagination-helper.js', ['seller.js']);
        });
    }
    
    // If seller.js is loaded but pagination-helper isn't, load pagination-helper
    if (sellerJsLoaded && !paginationHelperLoaded) {
        console.log('seller.js is loaded, now loading pagination-helper.js...');
        loadScriptIfNeeded('./assets/js/pagination-helper.js', ['seller.js']);
    }
    
    // If neither is loaded, load them in the correct order
    if (!sellerJsLoaded && !paginationHelperLoaded) {
        console.log('Neither script is loaded. Loading them in the correct order...');
        loadScriptIfNeeded('./assets/js/seller.js', [], function() {
            loadScriptIfNeeded('./assets/js/pagination-helper.js', ['seller.js']);
        });
    }
}

// Expose functions to global scope
window.isScriptLoaded = isScriptLoaded;
window.loadScriptIfNeeded = loadScriptIfNeeded;
window.checkPaginationScriptOrder = checkPaginationScriptOrder;

// Run the check after the page is loaded
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(checkPaginationScriptOrder, 500); // Small delay to ensure all initial scripts are processed
});

// Run another check after window load to catch any late-loaded scripts
window.addEventListener('load', function() {
    setTimeout(checkPaginationScriptOrder, 1000);
});

console.log("Script Loader Helper setup completed");
