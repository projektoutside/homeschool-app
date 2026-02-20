// Farmers Market Frenzy 3D - Product Manager
class ProductManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        
        // Product inventory
        this.inventory = {};
        this.salesData = {};
        this.popularProducts = {};
        
        // Seasonal data
        this.currentSeason = GameConfig.getCurrentSeason();
        this.seasonalModifiers = {
            spring: { vegetables: 1.1, fruits: 0.9, baked_goods: 1.0, preserves: 1.0 },
            summer: { vegetables: 0.9, fruits: 0.8, baked_goods: 1.1, preserves: 1.0 },
            fall: { vegetables: 0.8, fruits: 1.0, baked_goods: 1.0, preserves: 0.9 },
            winter: { vegetables: 1.2, fruits: 1.1, baked_goods: 0.9, preserves: 1.0 }
        };
        
        // Market statistics
        this.totalSales = 0;
        this.totalRevenue = 0;
        this.averageOrderValue = 0;
        this.topSellingProducts = [];
        
        // DOM element cache
        this.productDisplayGrid = null;
        
        this.init();
    }
    
    init() {
        // Cache DOM elements
        this.productDisplayGrid = document.getElementById('productDisplayGrid');
        
        this.initializeInventory();
        this.calculateSeasonalPrices();
        this.loadSalesData();
        this.initializeProductDisplay();
    }
    
    initializeInventory() {
        // Get all products including custom ones from SettingsManager
        const allProducts = this.getAllProducts();
        
        if (!allProducts || typeof allProducts !== 'object') {
            console.error('Invalid products data received:', allProducts);
            return;
        }
        
        // Initialize inventory for all products
        Object.keys(allProducts).forEach(category => {
            if (!allProducts[category] || !Array.isArray(allProducts[category])) {
                console.warn(`Invalid category data for ${category}:`, allProducts[category]);
                return;
            }
            
            this.inventory[category] = {};
            this.salesData[category] = {};
            
            allProducts[category].forEach(product => {
                if (!product || typeof product !== 'object' || !product.name) {
                    console.warn('Invalid product data:', product);
                    return;
                }
                
                // Standardize on basePrice property with proper fallback
                const basePrice = product.basePrice || product.price || 1.00;
                
                this.inventory[category][product.name] = {
                    ...product,
                    basePrice: basePrice,
                    currentPrice: basePrice,
                    stock: this.getRandomStock(),
                    sold: 0,
                    revenue: 0,
                    lastRestocked: Date.now(),
                    popularity: Math.random() * 0.5 + 0.5 // 0.5 - 1.0
                };
                
                this.salesData[category][product.name] = {
                    dailySales: 0,
                    weeklySales: 0,
                    totalSales: 0,
                    salesHistory: []
                };
            });
        });
    }

    getAllProducts() {
        // Get products from SettingsManager if available, otherwise use GameConfig
        try {
            if (window.settingsManager && typeof window.settingsManager.getAllItems === 'function') {
                return window.settingsManager.getAllItems();
            }
        } catch (error) {
            console.warn('Failed to get products from SettingsManager:', error);
        }
        
        // Fallback to GameConfig
        return GameConfig.MARKET_ITEMS;
    }

    refreshItems() {
        // Refresh inventory when settings change
        console.log('🔄 Refreshing product inventory...');
        
        // Save current sales data
        const currentSalesData = { ...this.salesData };
        
        // Reinitialize inventory with new items
        this.initializeInventory();
        
        // Restore sales data for existing products
        Object.keys(currentSalesData).forEach(category => {
            if (this.salesData[category]) {
                Object.keys(currentSalesData[category]).forEach(productName => {
                    if (this.salesData[category][productName]) {
                        this.salesData[category][productName] = currentSalesData[category][productName];
                    }
                });
            }
        });
        
        // Recalculate seasonal prices
        this.calculateSeasonalPrices();
        
        // Update display
        this.updateProductDisplay();
        
        console.log('✅ Product inventory refreshed');
    }
    
    getRandomStock() {
        // Generate realistic stock levels
        return Math.floor(Math.random() * 50) + 20; // 20-70 items
    }
    
    calculateSeasonalPrices() {
        const seasonModifiers = this.seasonalModifiers[this.currentSeason] || {};
        
        Object.keys(this.inventory).forEach(category => {
            const modifier = seasonModifiers[category] || 1.0;
            
            Object.keys(this.inventory[category]).forEach(productName => {
                const product = this.inventory[category][productName];
                if (product && product.basePrice) {
                    product.seasonalPrice = parseFloat((product.basePrice * modifier).toFixed(2));
                    product.currentPrice = product.seasonalPrice;
                }
            });
        });
    }
    
    loadSalesData() {
        // Load previous sales data if available
        const savedData = GameConfig.loadGameData();
        if (savedData && savedData.productSalesData) {
            this.salesData = { ...this.salesData, ...savedData.productSalesData };
        }
    }

    initializeProductDisplay() {
        if (!this.productDisplayGrid) {
            console.log('Product display grid not available - skipping product display');
            return;
        }

        // Get all available products
        const availableProducts = this.getAvailableProducts();
        
        // Clear existing display
        this.productDisplayGrid.innerHTML = '';

        // Create product display items
        availableProducts.forEach(product => {
            if (product && product.currentPrice !== undefined) {
                const productItem = document.createElement('div');
                productItem.className = 'product-item';
                
                productItem.innerHTML = `
                    <span class="product-emoji">${product.emoji || '❓'}</span>
                    <div class="product-name">${product.name || 'Unknown'}</div>
                    <div class="product-price">$${product.currentPrice.toFixed(2)}</div>
                `;
                
                this.productDisplayGrid.appendChild(productItem);
            }
        });
    }

    updateProductDisplay() {
        // Update the product display
        if (!this.productDisplayGrid) return;

        const availableProducts = this.getAvailableProducts();
        this.productDisplayGrid.innerHTML = '';

        availableProducts.forEach(product => {
            if (product && product.currentPrice !== undefined) {
                const productItem = document.createElement('div');
                productItem.className = 'product-item';
                
                productItem.innerHTML = `
                    <span class="product-emoji">${product.emoji || '❓'}</span>
                    <div class="product-name">${product.name || 'Unknown'}</div>
                    <div class="product-price">$${product.currentPrice.toFixed(2)}</div>
                `;
                
                this.productDisplayGrid.appendChild(productItem);
            }
        });
    }

    setDifficulty(difficulty) {
        console.log(`\n🏷️ ProductManager: Setting difficulty to ${difficulty} mode`);
        this.difficulty = difficulty;
        
        // Adjust all product prices for the new difficulty
        this.adjustPricesForDifficulty(difficulty);
        
        // Force update the product display to show new prices
        console.log('🔄 Updating product display with new prices...');
        this.updateProductDisplay();
        
        // Also update the simple product display if it exists
        this.updateSimpleProductDisplay();
        
        console.log(`✅ ProductManager difficulty set to ${difficulty} mode\n`);
    }

    updateSimpleProductDisplay() {
        // Update the simple product display bar at the bottom
        if (this.gameManager && typeof this.gameManager.initializeSimpleProductDisplay === 'function') {
            this.gameManager.initializeSimpleProductDisplay();
        }
    }

    adjustPricesForDifficulty(difficulty) {
        console.log(`🔧 Adjusting prices for ${difficulty} difficulty...`);
        
        try {
            Object.keys(this.inventory).forEach(category => {
                Object.keys(this.inventory[category]).forEach(productName => {
                    const product = this.inventory[category][productName];
                    
                    if (product && product.basePrice) {
                        // Apply seasonal modifier first
                        const seasonModifier = this.seasonalModifiers[this.currentSeason][category] || 1.0;
                        const seasonalPrice = product.basePrice * seasonModifier;
                        
                        // Then apply difficulty adjustment
                        const adjustedPrice = GameConfig.adjustPriceForDifficulty(seasonalPrice, difficulty);
                        
                        // For Easy Mode, ensure the final price is a whole dollar
                        if (difficulty === 'easy') {
                            const finalPrice = Math.round(adjustedPrice);
                            product.currentPrice = Math.max(1.00, finalPrice);
                            console.log(`${product.emoji} ${product.name}: $${product.basePrice.toFixed(2)} (base) → $${seasonalPrice.toFixed(2)} (seasonal) → $${adjustedPrice.toFixed(2)} (difficulty) → $${product.currentPrice.toFixed(2)} (final easy mode)`);
                        } else {
                            product.currentPrice = adjustedPrice;
                            console.log(`${product.emoji} ${product.name}: $${product.basePrice.toFixed(2)} (base) → $${seasonalPrice.toFixed(2)} (seasonal) → $${product.currentPrice.toFixed(2)} (final)`);
                        }
                    }
                });
            });
            
            console.log(`✅ Price adjustment complete for ${difficulty} mode`);
            
        } catch (error) {
            console.error('❌ Error adjusting prices for difficulty:', error);
        }
    }
    
    saveSalesData() {
        const gameData = GameConfig.loadGameData() || GameConfig.getDefaultGameData();
        gameData.productSalesData = this.salesData;
        GameConfig.saveGameData(gameData);
    }
    
    // Product selection and ordering
    getAvailableProducts() {
        const availableProducts = [];
        
        Object.keys(this.inventory).forEach(category => {
            Object.keys(this.inventory[category]).forEach(productName => {
                const product = this.inventory[category][productName];
                
                // Check if product is in stock
                if (product.stock > 0) {
                    // Check seasonal availability
                    if (!product.seasonal || this.isSeasonallyAvailable(product)) {
                        availableProducts.push({
                            ...product,
                            category: category
                        });
                    }
                }
            });
        });
        
        return availableProducts;
    }
    
    isSeasonallyAvailable(product) {
        if (!product.seasonal) return true;
        return product.seasons && product.seasons.includes(this.currentSeason);
    }
    
    getRandomProducts(count) {
        const available = this.getAvailableProducts();
        const selected = [];
        
        // Weighted selection based on popularity
        for (let i = 0; i < count && available.length > 0; i++) {
            const weightedProducts = this.createWeightedProductList(available);
            const randomIndex = Math.floor(Math.random() * weightedProducts.length);
            const selectedProduct = weightedProducts[randomIndex];
            
            selected.push(selectedProduct);
            
            // Remove selected product to avoid duplicates
            const originalIndex = available.findIndex(p => 
                p.name === selectedProduct.name && p.category === selectedProduct.category
            );
            if (originalIndex > -1) {
                available.splice(originalIndex, 1);
            }
        }
        
        return selected;
    }
    
    createWeightedProductList(products) {
        const weighted = [];
        
        products.forEach(product => {
            // More popular products appear more times in the array
            const weight = Math.ceil(product.popularity * 5);
            for (let i = 0; i < weight; i++) {
                weighted.push(product);
            }
        });
        
        return weighted;
    }
    
    getProductsByCategory(category) {
        if (!this.inventory[category]) return [];
        
        const products = [];
        
        Object.values(this.inventory[category]).forEach(product => {
            if (product.stock > 0 && 
                this.isSeasonallyAvailable(product)) {
                
                products.push({
                    ...product,
                    category: category
                });
            }
        });
        
        return products;
    }
    
    // Sales processing
    processSale(items) {
        let totalRevenue = 0;
        const processedItems = [];
        
        items.forEach(item => {
            const product = this.getProduct(item.name, item.category);
            
            if (product && product.stock >= (item.quantity || 1)) {
                // Update inventory
                product.stock -= (item.quantity || 1);
                product.sold += (item.quantity || 1);
                
                const itemRevenue = product.currentPrice * (item.quantity || 1);
                product.revenue += itemRevenue;
                totalRevenue += itemRevenue;
                
                // Update sales data
                this.updateSalesData(item.name, item.category, item.quantity || 1, itemRevenue);
                
                processedItems.push({
                    ...item,
                    price: product.currentPrice,
                    revenue: itemRevenue
                });
                
                console.log(`Sold ${item.quantity || 1}x ${item.name} for ${GameConfig.formatMoney(itemRevenue)}`);
            } else {
                console.warn(`Insufficient stock for ${item.name}`);
            }
        });
        
        // Update market statistics
        this.updateMarketStatistics(processedItems, totalRevenue);
        
        return {
            items: processedItems,
            totalRevenue: totalRevenue,
            success: processedItems.length === items.length
        };
    }
    
    updateSalesData(productName, category, quantity, revenue) {
        if (this.salesData[category] && this.salesData[category][productName]) {
            const salesData = this.salesData[category][productName];
            
            salesData.dailySales += quantity;
            salesData.weeklySales += quantity;
            salesData.totalSales += quantity;
            
            salesData.salesHistory.push({
                date: new Date().toISOString(),
                quantity: quantity,
                revenue: revenue
            });
            
            // Keep only last 30 days of history
            if (salesData.salesHistory.length > 30) {
                salesData.salesHistory = salesData.salesHistory.slice(-30);
            }
        }
    }
    
    updateMarketStatistics(items, revenue) {
        this.totalSales += items.length;
        this.totalRevenue += revenue;
        this.averageOrderValue = this.totalRevenue / Math.max(1, this.totalSales);
        
        // Update product popularity based on sales
        items.forEach(item => {
            const product = this.getProduct(item.name, item.category);
            if (product) {
                product.popularity = Math.min(1.0, product.popularity + 0.01);
            }
        });
        
        // Update top selling products
        this.calculateTopSellingProducts();
        
        // Auto-save sales data
        this.saveSalesData();
    }
    
    calculateTopSellingProducts() {
        const allProducts = [];
        
        Object.keys(this.inventory).forEach(category => {
            Object.values(this.inventory[category]).forEach(product => {
                allProducts.push({
                    ...product,
                    category: category
                });
            });
        });
        
        // Sort by total sales
        allProducts.sort((a, b) => b.sold - a.sold);
        
        this.topSellingProducts = allProducts.slice(0, 10);
    }
    
    // Inventory management
    restockProduct(productName, category, quantity) {
        const product = this.getProduct(productName, category);
        
        if (product) {
            product.stock += quantity;
            product.lastRestocked = Date.now();
            
            console.log(`Restocked ${quantity}x ${productName}, new stock: ${product.stock}`);
            return true;
        }
        
        return false;
    }
    
    autoRestock() {
        // Automatically restock low-stock items
        Object.keys(this.inventory).forEach(category => {
            Object.values(this.inventory[category]).forEach(product => {
                if (product.stock < 10) { // Restock when below 10 items
                    const restockAmount = Math.floor(Math.random() * 30) + 20;
                    this.restockProduct(product.name, category, restockAmount);
                }
            });
        });
    }
    
    getLowStockProducts() {
        const lowStock = [];
        
        Object.keys(this.inventory).forEach(category => {
            Object.values(this.inventory[category]).forEach(product => {
                if (product.stock < 15) {
                    lowStock.push({
                        ...product,
                        category: category
                    });
                }
            });
        });
        
        return lowStock.sort((a, b) => a.stock - b.stock);
    }
    
    // Price management
    adjustPricesForDemand() {
        Object.keys(this.inventory).forEach(category => {
            Object.values(this.inventory[category]).forEach(product => {
                // Increase price for popular, low-stock items
                if (product.popularity > 0.8 && product.stock < 15) {
                    product.currentPrice = Math.min(
                        product.seasonalPrice * 1.2,
                        parseFloat((product.currentPrice * 1.05).toFixed(2))
                    );
                }
                // Decrease price for low-popularity, high-stock items
                else if (product.popularity < 0.3 && product.stock > 40) {
                    product.currentPrice = Math.max(
                        product.seasonalPrice * 0.8,
                        parseFloat((product.currentPrice * 0.95).toFixed(2))
                    );
                }
                // Gradually return to seasonal price
                else {
                    const targetPrice = product.seasonalPrice;
                    const difference = targetPrice - product.currentPrice;
                    product.currentPrice = parseFloat((product.currentPrice + difference * 0.1).toFixed(2));
                }
            });
        });
    }
    
    // Analytics and reporting
    getMarketReport() {
        return {
            totalSales: this.totalSales,
            totalRevenue: this.totalRevenue,
            averageOrderValue: this.averageOrderValue,
            topSellingProducts: this.topSellingProducts,
            lowStockProducts: this.getLowStockProducts(),
            currentSeason: this.currentSeason,
            inventoryValue: this.calculateInventoryValue(),
            categoryPerformance: this.getCategoryPerformance()
        };
    }
    
    calculateInventoryValue() {
        let totalValue = 0;
        
        Object.keys(this.inventory).forEach(category => {
            Object.values(this.inventory[category]).forEach(product => {
                totalValue += product.stock * product.currentPrice;
            });
        });
        
        return totalValue;
    }
    
    getCategoryPerformance() {
        const performance = {};
        
        Object.keys(this.inventory).forEach(category => {
            let categoryRevenue = 0;
            let categorySales = 0;
            
            Object.values(this.inventory[category]).forEach(product => {
                categoryRevenue += product.revenue;
                categorySales += product.sold;
            });
            
            performance[category] = {
                revenue: categoryRevenue,
                sales: categorySales,
                averagePrice: categorySales > 0 ? categoryRevenue / categorySales : 0
            };
        });
        
        return performance;
    }
    
    // Utility methods
    getProduct(name, category) {
        if (this.inventory[category] && this.inventory[category][name]) {
            return this.inventory[category][name];
        }
        return null;
    }
    
    searchProducts(query) {
        const results = [];
        const searchTerm = query.toLowerCase();
        
        Object.keys(this.inventory).forEach(category => {
            Object.values(this.inventory[category]).forEach(product => {
                if (product.name.toLowerCase().includes(searchTerm)) {
                    results.push({
                        ...product,
                        category: category
                    });
                }
            });
        });
        
        return results;
    }
    
    getProductInfo(name, category) {
        const product = this.getProduct(name, category);
        
        if (product) {
            const salesData = this.salesData[category][name];
            
            return {
                ...product,
                category: category,
                salesData: salesData,
                profitMargin: this.calculateProfitMargin(product),
                stockStatus: this.getStockStatus(product),
                demandLevel: this.getDemandLevel(product)
            };
        }
        
        return null;
    }
    
    calculateProfitMargin(product) {
        // Simple profit margin calculation (assuming 40% cost)
        // Use basePrice for cost calculation since it represents the original wholesale cost
        const costPrice = (product.basePrice || product.currentPrice) * 0.6;
        return ((product.currentPrice - costPrice) / product.currentPrice) * 100;
    }
    
    getStockStatus(product) {
        if (product.stock <= 5) return 'critical';
        if (product.stock <= 15) return 'low';
        if (product.stock <= 30) return 'medium';
        return 'high';
    }
    
    getDemandLevel(product) {
        if (product.popularity >= 0.8) return 'high';
        if (product.popularity >= 0.5) return 'medium';
        return 'low';
    }
    
    // Seasonal updates
    updateSeason() {
        const newSeason = GameConfig.getCurrentSeason();
        
        if (newSeason !== this.currentSeason) {
            console.log(`Season changed from ${this.currentSeason} to ${newSeason}`);
            
            this.currentSeason = newSeason;
            this.calculateSeasonalPrices();
            
            // Trigger special seasonal events
            this.triggerSeasonalEvent();
        }
    }
    
    triggerSeasonalEvent() {
        // Add seasonal products or special pricing
        const seasonalProducts = GameConfig.getSeasonalProducts(this.currentSeason);
        
        seasonalProducts.forEach(product => {
            const category = this.findProductCategory(product.name);
            if (category) {
                const inventoryProduct = this.getProduct(product.name, category);
                if (inventoryProduct) {
                    // Boost seasonal product popularity
                    inventoryProduct.popularity = Math.min(1.0, inventoryProduct.popularity + 0.2);
                    
                    // Special seasonal pricing
                    inventoryProduct.currentPrice = parseFloat((inventoryProduct.seasonalPrice * 0.9).toFixed(2));
                }
            }
        });
    }
    
    findProductCategory(productName) {
        for (const category in GameConfig.MARKET_ITEMS) {
            const found = GameConfig.MARKET_ITEMS[category].find(p => p.name === productName);
            if (found) return category;
        }
        return null;
    }
    
    // Reset and cleanup
    resetInventory() {
        this.initializeInventory();
        this.calculateSeasonalPrices();
        
        // Reset statistics
        this.totalSales = 0;
        this.totalRevenue = 0;
        this.averageOrderValue = 0;
        this.topSellingProducts = [];
    }
    
    dispose() {
        this.saveSalesData();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProductManager;
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    window.ProductManager = ProductManager;
}