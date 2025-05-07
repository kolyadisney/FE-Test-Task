window.ImagesResolver = (function () {
  class ImagesResolver {
    constructor() {
      // Initialize search modules
      this.searchModules = {
        'local': this.searchLocal.bind(this),
        'pixabay': this.searchPixabay.bind(this)
      };

      // Store ongoing requests to prevent race conditions
      this.ongoingRequests = new Map();

      // Track the latest request for each gallery
      this.latestGalleryRequests = new WeakMap();

      // ID counter for request tracking
      this.requestIdCounter = 0;

      // Config validation
      this._validateConfig();
    }

    /**
     * Validate that required configuration is available
     * @private
     */
    _validateConfig() {
      if (!window.AppConfig) {
        console.warn('AppConfig not found. Using default configurations.');
        return;
      }

      if (!window.AppConfig.api || !window.AppConfig.api.pixabay || !window.AppConfig.api.pixabay.apiKey) {
        console.warn('Pixabay API configuration missing. Some features may not work correctly.');
      }
    }

    /**
     * Register a gallery to track its requests
     * @param {ImageGallery} gallery - The gallery to register
     * @returns {void}
     */
    registerGallery(gallery) {
      if (!gallery) {
        return;
      }

      if (!this.latestGalleryRequests.has(gallery)) {
        this.latestGalleryRequests.set(gallery, null);
      }
    }

    /**
     * Search for images using specified module
     * @param {String} query - Search query
     * @param {String} searchModuleId - ID of the search module to use
     * @param {ImageGallery} [gallery] - The gallery making the request (optional)
     * @returns {Promise<Object>} - Promise that resolves with search results
     * @throws {Error} If search module ID is not defined or unknown
     */
    search(query, searchModuleId, gallery) {
      if (!searchModuleId) {
        throw new Error('Search module ID must be defined');
      }

      if (!this.searchModules[searchModuleId]) {
        throw new Error(`Unknown search module: ${searchModuleId}`);
      }

      const requestId = this.requestIdCounter++;

      if (gallery) {
        this.registerGallery(gallery);
        this.latestGalleryRequests.set(gallery, requestId);
      }

      const requestKey = `${searchModuleId}:${query}:${requestId}`;

      const searchPromise = this.searchModules[searchModuleId](query);

      this.ongoingRequests.set(requestKey, searchPromise);

      return searchPromise
        .then(result => {
          this.ongoingRequests.delete(requestKey);

          if (gallery && this.latestGalleryRequests.get(gallery) !== requestId) {
            return new Promise(() => { });
          }

          return result;
        })
        .catch(error => {
          this.ongoingRequests.delete(requestKey);

          if (gallery && this.latestGalleryRequests.get(gallery) !== requestId) {
            return new Promise(() => { });
          }

          throw error;
        });
    }

    searchLocal(query) {
      const trimmedQuery = query ? query.trim() : '';
      if (!trimmedQuery) {
        return Promise.resolve({
          query: trimmedQuery,
          images: []
        });
      }

      try {
        const matchedImages = window.localDB.filter(image => {
          const tags = image.tags.split(',').map(tag => tag.trim());
          return tags.includes(trimmedQuery);
        });

        const result = {
          query: trimmedQuery,
          images: matchedImages.map(image => ({
            id: image.id,
            url: image.previewURL,
            tags: image.tags
          }))
        };

        return Promise.resolve(result);
      } catch (error) {
        return Promise.reject(error);
      }
    }

    searchPixabay(query) {
      const trimmedQuery = query ? query.trim() : '';
      if (!trimmedQuery) {
        return Promise.resolve({
          query: trimmedQuery,
          images: []
        });
      }

      const config = window.AppConfig && window.AppConfig.api && window.AppConfig.api.pixabay
        ? window.AppConfig.api.pixabay
        : {
          apiKey: '8522875-59a2673910903be627161f155',
          baseUrl: 'https://pixabay.com/api/',
          defaults: {
            perPage: 100,
            imageType: 'all'
          }
        };

      const apiUrl = `${config.baseUrl}?key=${config.apiKey}&q=${encodeURIComponent(trimmedQuery)}&image_type=${config.defaults.imageType}&per_page=${config.defaults.perPage}`;

      return fetch(apiUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          return {
            query: trimmedQuery,
            images: (data.hits || []).map(image => ({
              id: image.id,
              url: image.webformatURL,
              tags: image.tags
            }))
          };
        })
        .catch(error => {
          console.error('Pixabay API error:', error);
          throw error;
        });
    }
  }

  return ImagesResolver;
})();