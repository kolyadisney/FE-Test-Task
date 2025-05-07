window.ImageGallery = (function () {
  class ImageGallery {
    /**
    * @constructor
    * @param {ImagesResolver} imagesResolver
    */
    constructor(imagesResolver) {
      if (!imagesResolver) {
        throw new Error('ImagesResolver is required');
      }

      this.imagesResolver = imagesResolver;

      // Track the latest search request to handle cancellations
      this.latestSearchQuery = null;

      this._initView();
      this._initViewFunctionality();

      // Register this gallery with the resolver
      if (typeof this.imagesResolver.registerGallery === 'function') {
        this.imagesResolver.registerGallery(this);
      }
    }

    /**
     * Get available search modules from the configuration
     * @returns {Object} The search modules configuration
     * @private
     */
    _getSearchModules() {
      if (window.AppConfig && window.AppConfig.searchModules) {
        return window.AppConfig.searchModules;
      }

      return {
        local: {
          id: 'local',
          displayName: 'Local'
        },
        pixabay: {
          id: 'pixabay',
          displayName: 'Pixabay'
        }
      };
    }

    /**
     * Search for images using the specified query and module
     * @param {String} query - Search query
     * @param {String} [searchModuleId] - ID of the search module to use
     * @returns {void}
     */
    search(query, searchModuleId) {
      if (!query) {
        console.warn('Empty search query provided');
      }

      const moduleId = searchModuleId || this.sourceSelect.value;

      this.latestSearchQuery = query;

      const currentQuery = query;

      // Call the resolver with query and module ID, passing this gallery as reference
      this.imagesResolver.search(query, moduleId, this)
        .then(searchResults => {
          // Only process results if this was the most recent search request
          if (this.latestSearchQuery === currentQuery) {
            this._onReceiveSearchResult(searchResults);
          }
        })
        .catch(error => {
          if (this.latestSearchQuery === currentQuery) {
            console.error('Search error:', error);
          }
        });
    }

    addToElement(element) {
      if (!element || !(element instanceof HTMLElement)) {
        console.error('Invalid element provided to addToElement');
        return;
      }

      element.appendChild(this.container);
    }

    _onUserSearch(ev) {
      ev.preventDefault();
      this.search(this.seachInput.value);
    }

    _onReceiveSearchResult(result) {
      this.searchResults.innerHTML = "";

      if (!result || !result.images) {
        return;
      }

      const imagesInfo = result.images;

      imagesInfo.forEach(image => {
        const imgNode = document.createElement('img');
        imgNode.setAttribute('src', image.url);
        imgNode.setAttribute('alt', image.tags || 'Image');
        this.searchResults.appendChild(imgNode);
      });
    }

    _initView() {
      this.container = document.createElement("div");
      this.container.className = "gallery";
      this._createSearchForm();
      this.searchResults = document.createElement("div");
      this.searchResults.className = "gallery__result";
      this.container.appendChild(this.searchResults);
    }

    _createSearchForm() {
      this.form = document.createElement("form");
      this.form.className = "gallery__form form-inline";
      this.container.appendChild(this.form);
      this.formGroup = document.createElement("div");
      this.formGroup.className = "form-group";
      this.form.appendChild(this.formGroup);
      this.seachInput = document.createElement("input");
      this.seachInput.className = "gallery__search form-control";
      this.seachInput.placeholder = "search by tag";
      this.formGroup.appendChild(this.seachInput);
      this._createSourceSelector();
      this.searchButton = document.createElement("button");
      this.searchButton.className = "gallery__button btn btn-primary";
      this.searchButton.innerText = "search";
      this.searchButton.type = "submit";
      this.form.appendChild(this.searchButton);
    }

    _createSourceSelector() {
      this.sourceSelect = document.createElement("select");
      this.sourceSelect.className = "gallery__source form-control";

      const searchModules = this._getSearchModules();

      Object.values(searchModules).forEach(module => {
        const option = document.createElement("option");
        option.value = module.id;
        option.textContent = module.displayName;
        this.sourceSelect.appendChild(option);
      });

      this.formGroup.appendChild(this.sourceSelect);
    }

    _initViewFunctionality() {
      this.form.addEventListener("submit", this._onUserSearch.bind(this));
    }
  }

  return ImageGallery;
})();