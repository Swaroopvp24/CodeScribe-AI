(function() {
  // --- 1. INTERCEPT XHR (Used by Axios and common request libraries) ---
  const proxiedOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._url = url; // Save URL for verification in onload
    return proxiedOpen.apply(this, [method, url, ...args]);
  };

  const proxiedSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(body) {
    this.addEventListener('load', function() {
      if (this._url && this._url.includes('executeCodeFunctionHttp')) {
        try {
          const resData = JSON.parse(this.responseText);
          
          // Verify exact match for "Accepted" status inside response data
          if (resData?.data?.status?.description === "Accepted") {
            const reqBody = JSON.parse(body);
            
            window.dispatchEvent(new CustomEvent("NEETCODE_SYNC_ACCEPTED", {
              detail: {
                code: reqBody.data.rawCode,
                lang: reqBody.data.lang,
                titleSlug: reqBody.data.problemId
              }
            }));
          }
        } catch (e) {
          // Fail silently if JSON parsing fails
        }
      }
    });
    return proxiedSend.apply(this, [body]);
  };

  // --- 2. INTERCEPT FETCH (Fallback) ---
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch(...args);
    const url = args[0];
    
    if (typeof url === 'string' && url.includes('executeCodeFunctionHttp')) {
      try {
        const resClone = response.clone();
        const resData = await resClone.json();
        
        if (resData?.data?.status?.description === "Accepted") {
          const reqBody = JSON.parse(args[1].body);
          
          window.dispatchEvent(new CustomEvent("NEETCODE_SYNC_ACCEPTED", {
            detail: {
              code: reqBody.data.rawCode,
              lang: reqBody.data.lang,
              titleSlug: reqBody.data.problemId
            }
          }));
        }
      } catch (e) {
        // Fail silently
      }
    }
    return response;
  };
})();