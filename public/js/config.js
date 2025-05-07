window.AppConfig = (function () {
    return {
        api: {
            pixabay: {
                apiKey: '8522875-59a2673910903be627161f155',
                baseUrl: 'https://pixabay.com/api/',
                defaults: {
                    perPage: 100,
                    imageType: 'all'
                }
            }
        },
        searchModules: {
            local: {
                id: 'local',
                displayName: 'Local'
            },
            pixabay: {
                id: 'pixabay',
                displayName: 'Pixabay'
            }
        }
    };
})(); 