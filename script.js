document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchResults = document.getElementById('search-results');
    
    // Sample data - replace with your actual data or API calls
    const sampleData = [
        { title: 'How to use our search feature', description: 'A complete guide to utilizing our powerful search functionality' },
        { title: 'Product Documentation', description: 'Detailed documentation about all our products and services' },
        { title: 'Pricing Plans', description: 'Explore our flexible pricing plans for individuals and businesses' },
        { title: 'Getting Started Guide', description: 'Learn how to get started with our platform in minutes' },
        { title: 'API Documentation', description: 'Technical documentation for developers integrating with our API' }
    ];
    
    // Function to perform search
    function performSearch(query) {
        // Clear previous results
        searchResults.innerHTML = '';
        
        if (!query.trim()) {
            searchResults.classList.remove('active');
            return;
        }
        
        // Filter data based on query
        // In a real app, this would be an API call or more complex search logic
        const filteredResults = sampleData.filter(item => {
            return item.title.toLowerCase().includes(query.toLowerCase()) || 
                   item.description.toLowerCase().includes(query.toLowerCase());
        });
        
        // Display results
        if (filteredResults.length === 0) {
            searchResults.innerHTML = '<div class="no-results">No results found</div>';
        } else {
            filteredResults.forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                
                const title = document.createElement('div');
                title.className = 'result-title';
                title.textContent = result.title;
                
                const description = document.createElement('div');
                description.className = 'result-description';
                description.textContent = result.description;
                
                resultItem.appendChild(title);
                resultItem.appendChild(description);
                
                // Add click event to result items
                resultItem.addEventListener('click', () => {
                    // Here you would typically navigate to the result page
                    alert(`You selected: ${result.title}`);
                });
                
                searchResults.appendChild(resultItem);
            });
        }
        
        // Show results container
        searchResults.classList.add('active');
    }
    
    // Event listeners
    searchButton.addEventListener('click', () => {
        performSearch(searchInput.value);
    });
    
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            performSearch(searchInput.value);
        }
    });
    
    // Auto-search after typing (with debounce)
    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            performSearch(searchInput.value);
        }, 300);
    });
    
    // Close results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchResults.contains(e.target) && e.target !== searchInput && e.target !== searchButton) {
            searchResults.classList.remove('active');
        }
    });
});

function displayProductImages(response) {
    const catalogue = document.getElementById('side-images-catalogue');
    if (!catalogue) return;

    // Clear existing images
    catalogue.innerHTML = '<div class="side-title">Product Catalogue</div>';

    // Extract product names from the response
    const productNames = extractProductNames(response);

    // Filter images based on product names
    const filteredImages = productNames.length > 0
        ? images.filter(img => productNames.some(name => img.alt.toLowerCase().includes(name.toLowerCase())))
        : images;

    // If no matching products, display all images
    if (filteredImages.length === 0) {
        images.forEach(img => {
            const imgElement = document.createElement('img');
            imgElement.src = img.src;
            imgElement.alt = img.alt;
            imgElement.className = 'side-image';
            catalogue.appendChild(imgElement);
        });
    } else {
        // Display only the filtered images
        filteredImages.forEach(img => {
            const imgElement = document.createElement('img');
            imgElement.src = img.src;
            imgElement.alt = img.alt;
            imgElement.className = 'side-image';
            catalogue.appendChild(imgElement);
        });
    }
}

// Helper function to extract product names from the response
function extractProductNames(response) {
    const productKeywords = ['product', 'products', 'item', 'items'];
    const words = response.toLowerCase().split(/\s+/);
    return words.filter(word => productKeywords.includes(word));
} 