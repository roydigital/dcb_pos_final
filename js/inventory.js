// Inventory Management System for DCB POS
document.addEventListener('DOMContentLoaded', () => {
    // Supabase Client Setup
    const SUPABASE_URL = 'https://kjbelegkbusvtvtcgwhq.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqYmVsZWdrYnVzdnR2dGNnd2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MjI5ODIsImV4cCI6MjA3NDA5ODk4Mn0.-K-rkuJnyDPL5YnkJ62-UG1_mG0BIILMUEZpSTNnq5M';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Global state
    let inventory = [];
    let inventoryUsage = [];
    let inventoryPurchases = [];

    // DOM Elements
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const refreshBtn = document.getElementById('refresh-btn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Forms
    const addItemForm = document.getElementById('add-item-form');
    const stockInForm = document.getElementById('stock-in-form');
    const stockOutForm = document.getElementById('stock-out-form');
    const editItemForm = document.getElementById('edit-item-form');

    // Modal Elements
    const editItemModal = document.getElementById('edit-item-modal');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    // Initialize the application
    init();

    async function init() {
        await loadAllData();
        setupEventListeners();
        updateDashboard();
        renderInventoryTable();
        populateIngredientDropdowns();
    }

    // --- Data Loading Functions ---
    async function loadAllData() {
        try {
            await Promise.all([
                fetchInventory(),
                fetchInventoryUsage(),
                fetchInventoryPurchases()
            ]);
            showToast('Data loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Error loading data', 'error');
        }
    }

    async function fetchInventory() {
        try {
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            inventory = data || [];
        } catch (error) {
            console.error('Error fetching inventory:', error);
            throw error;
        }
    }

    async function fetchInventoryUsage() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('inventory_usage')
                .select('*')
                .gte('created_at', today)
                .order('created_at', { ascending: false });

            if (error) throw error;
            inventoryUsage = data || [];
        } catch (error) {
            console.error('Error fetching inventory usage:', error);
            throw error;
        }
    }

    async function fetchInventoryPurchases() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('inventory_purchases')
                .select('*')
                .gte('created_at', today)
                .order('created_at', { ascending: false });

            if (error) throw error;
            inventoryPurchases = data || [];
        } catch (error) {
            console.error('Error fetching inventory purchases:', error);
            throw error;
        }
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // Tab navigation
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                switchTab(tabId);
            });
        });

        // Refresh button
        refreshBtn.addEventListener('click', loadAllData);

        // Form submissions
        addItemForm.addEventListener('submit', handleAddItem);
        stockInForm.addEventListener('submit', handleStockIn);
        stockOutForm.addEventListener('submit', handleStockOut);
        editItemForm.addEventListener('submit', handleEditItem);

        // Modal events
        cancelEditBtn.addEventListener('click', () => {
            editItemModal.classList.add('hidden');
        });

        // Inventory table filters
        document.getElementById('search-inventory').addEventListener('input', renderInventoryTable);
        document.getElementById('filter-unit').addEventListener('change', renderInventoryTable);
        document.getElementById('filter-stock').addEventListener('change', renderInventoryTable);

        // Usage type change for order ID field
        document.getElementById('usage-type').addEventListener('change', (e) => {
            const orderIdSection = document.getElementById('order-id-section');
            if (e.target.value === 'sales') {
                orderIdSection.classList.remove('hidden');
            } else {
                orderIdSection.classList.add('hidden');
            }
        });

        // Reports
        document.getElementById('report-period').addEventListener('change', handleReportPeriodChange);
        document.getElementById('generate-report').addEventListener('click', generateReports);
        document.getElementById('export-csv').addEventListener('click', exportToCSV);
    }

    // --- Tab Navigation ---
    function switchTab(tabId) {
        // Update active tab button
        tabButtons.forEach(button => {
            if (button.dataset.tab === tabId) {
                button.classList.add('border-blue-500', 'text-blue-600');
                button.classList.remove('border-transparent', 'text-gray-500');
            } else {
                button.classList.remove('border-blue-500', 'text-blue-600');
                button.classList.add('border-transparent', 'text-gray-500');
            }
        });

        // Show active tab content
        tabContents.forEach(content => {
            if (content.id === tabId) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        // Refresh data for specific tabs
        if (tabId === 'dashboard') {
            updateDashboard();
        } else if (tabId === 'inventory') {
            renderInventoryTable();
        } else if (tabId === 'reports') {
            generateReports();
        }
    }

    // --- Dashboard Functions ---
    async function updateDashboard() {
        try {
            // Calculate metrics
            const totalStockValue = inventory.reduce((sum, item) => {
                return sum + (item.stock * (item.cost_per_unit || 0));
            }, 0);

            const today = new Date().toISOString().split('T')[0];
            const todayUsage = inventoryUsage.filter(usage => 
                usage.created_at.startsWith(today)
            );
            const todayUsageCost = todayUsage.reduce((sum, usage) => sum + (usage.cost_incurred || 0), 0);

            // This week's usage (last 7 days)
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weekUsage = inventoryUsage.filter(usage => 
                new Date(usage.created_at) >= weekAgo
            );
            const weekUsageCost = weekUsage.reduce((sum, usage) => sum + (usage.cost_incurred || 0), 0);

            // Low stock items
            const lowStockCount = inventory.filter(item => 
                item.stock <= item.minimum_stock
            ).length;

            // Wastage cost (usage with order_id null)
            const wastageCost = inventoryUsage.filter(usage => 
                !usage.order_id && usage.created_at.startsWith(today)
            ).reduce((sum, usage) => sum + (usage.cost_incurred || 0), 0);

            // COGS (only entries with order_id not null)
            const cogsToday = inventoryUsage.filter(usage => 
                usage.order_id && usage.created_at.startsWith(today)
            ).reduce((sum, usage) => sum + (usage.cost_incurred || 0), 0);

            // Top 5 consumed ingredients today
            const ingredientUsage = {};
            todayUsage.forEach(usage => {
                const ingredient = inventory.find(item => item.id === usage.ingredient_id);
                if (ingredient) {
                    if (!ingredientUsage[ingredient.name]) {
                        ingredientUsage[ingredient.name] = 0;
                    }
                    ingredientUsage[ingredient.name] += usage.quantity_used;
                }
            });

            const topIngredients = Object.entries(ingredientUsage)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5);

            // Update UI
            document.getElementById('total-stock-value').textContent = `₹${totalStockValue.toFixed(2)}`;
            document.getElementById('today-usage-cost').textContent = `₹${todayUsageCost.toFixed(2)}`;
            document.getElementById('week-usage-cost').textContent = `₹${weekUsageCost.toFixed(2)}`;
            document.getElementById('low-stock-count').textContent = lowStockCount;
            document.getElementById('wastage-cost').textContent = `₹${wastageCost.toFixed(2)}`;
            document.getElementById('cogs-today').textContent = `₹${cogsToday.toFixed(2)}`;

            // Update top ingredients list
            const topIngredientsList = document.getElementById('top-ingredients-list');
            if (topIngredients.length > 0) {
                topIngredientsList.innerHTML = topIngredients.map(([name, quantity]) => `
                    <div class="flex justify-between items-center">
                        <span class="font-medium">${name}</span>
                        <span class="text-gray-600">${quantity.toFixed(2)}</span>
                    </div>
                `).join('');
            } else {
                topIngredientsList.innerHTML = '<p class="text-gray-500 text-center">No usage data for today</p>';
            }

        } catch (error) {
            console.error('Error updating dashboard:', error);
            showToast('Error updating dashboard', 'error');
        }
    }

    // --- Inventory Table Functions ---
    function renderInventoryTable() {
        const tableBody = document.getElementById('inventory-table-body');
        const searchTerm = document.getElementById('search-inventory').value.toLowerCase();
        const unitFilter = document.getElementById('filter-unit').value;
        const stockFilter = document.getElementById('filter-stock').value;

        let filteredInventory = inventory.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm);
            const matchesUnit = !unitFilter || item.unit === unitFilter;
            const matchesStock = !stockFilter || 
                (stockFilter === 'low' && item.stock <= item.minimum_stock) ||
                (stockFilter === 'normal' && item.stock > item.minimum_stock);
            
            return matchesSearch && matchesUnit && matchesStock;
        });

        if (filteredInventory.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="px-6 py-4 text-center text-gray-500">
                        No inventory items found
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filteredInventory.map(item => {
            const stockValue = (item.stock * (item.cost_per_unit || 0)).toFixed(2);
            const isLowStock = item.stock <= item.minimum_stock;
            const rowClass = isLowStock ? 'low-stock' : '';

            return `
                <tr class="${rowClass}">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${item.name}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${item.stock}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${item.unit}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">₹${(item.cost_per_unit || 0).toFixed(2)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">₹${stockValue}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${item.minimum_stock}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${item.supplier_info || '-'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${formatDate(item.last_updated)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button class="edit-item-btn text-blue-600 hover:text-blue-900 mr-3" data-id="${item.id}">
                            Edit
                        </button>
                        <button class="delete-item-btn text-red-600 hover:text-red-900" data-id="${item.id}">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Add event listeners to action buttons
        document.querySelectorAll('.edit-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.dataset.id;
                openEditModal(itemId);
            });
        });

        document.querySelectorAll('.delete-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.dataset.id;
                deleteItem(itemId);
            });
        });
    }

    // --- Form Handlers ---
    async function handleAddItem(e) {
        e.preventDefault();
        const formData = new FormData(addItemForm);
        const itemData = {
            name: formData.get('name').trim(),
            stock: parseFloat(formData.get('stock')) || 0,
            unit: formData.get('unit'),
            minimum_stock: parseFloat(formData.get('minimum_stock')),
            cost_per_unit: parseFloat(formData.get('cost_per_unit')),
            supplier_info: formData.get('supplier_info')?.trim() || null,
            created_at: new Date().toISOString(),
            last_updated: new Date().toISOString()
        };

        try {
            // Check for duplicate names
            const existingItem = inventory.find(item => 
                item.name.toLowerCase() === itemData.name.toLowerCase()
            );
            if (existingItem) {
                showToast('Item with this name already exists', 'error');
                return;
            }

            const { data, error } = await supabase
                .from('inventory')
                .insert([itemData])
                .select();

            if (error) throw error;

            showToast('Item added successfully', 'success');
            addItemForm.reset();
            await fetchInventory();
            renderInventoryTable();
            updateDashboard();
            populateIngredientDropdowns();
        } catch (error) {
            console.error('Error adding item:', error);
            showToast('Error adding item', 'error');
        }
    }

    async function handleStockIn(e) {
        e.preventDefault();
        const formData = new FormData(stockInForm);
        const purchaseData = {
            ingredient_id: formData.get('ingredient_id'),
            quantity: parseFloat(formData.get('quantity')),
            cost_per_unit: parseFloat(formData.get('cost_per_unit')),
            total_cost: parseFloat(formData.get('quantity')) * parseFloat(formData.get('cost_per_unit')),
            supplier: formData.get('supplier').trim(),
            notes: formData.get('notes')?.trim() || null,
            created_at: new Date().toISOString()
        };

        try {
            // Update inventory stock and cost
            const ingredient = inventory.find(item => item.id === purchaseData.ingredient_id);
            if (!ingredient) {
                showToast('Ingredient not found', 'error');
                return;
            }

            const newStock = ingredient.stock + purchaseData.quantity;
            const newCostPerUnit = purchaseData.cost_per_unit; // Update to latest purchase cost

            // Update inventory
            const { error: updateError } = await supabase
                .from('inventory')
                .update({
                    stock: newStock,
                    cost_per_unit: newCostPerUnit,
                    last_updated: new Date().toISOString()
                })
                .eq('id', purchaseData.ingredient_id);

            if (updateError) throw updateError;

            // Record purchase
            const { error: purchaseError } = await supabase
                .from('inventory_purchases')
                .insert([purchaseData]);

            if (purchaseError) throw purchaseError;

            showToast('Stock added successfully', 'success');
            stockInForm.reset();
            await Promise.all([fetchInventory(), fetchInventoryPurchases()]);
            renderInventoryTable();
            updateDashboard();
        } catch (error) {
            console.error('Error adding stock:', error);
            showToast('Error adding stock', 'error');
        }
    }

    async function handleStockOut(e) {
        e.preventDefault();
        const formData = new FormData(stockOutForm);
        const usageData = {
            ingredient_id: formData.get('ingredient_id'),
            quantity_used: parseFloat(formData.get('quantity')),
            usage_type: formData.get('usage_type'),
            order_id: formData.get('order_id')?.trim() || null,
            notes: formData.get('notes')?.trim() || null,
            created_at: new Date().toISOString()
        };

        try {
            // Get ingredient and calculate cost
            const ingredient = inventory.find(item => item.id === usageData.ingredient_id);
            if (!ingredient) {
                showToast('Ingredient not found', 'error');
                return;
            }

            // Check if enough stock is available
            if (ingredient.stock < usageData.quantity_used) {
                showToast('Not enough stock available', 'error');
                return;
            }

            // Calculate cost incurred
            usageData.cost_incurred = usageData.quantity_used * (ingredient.cost_per_unit || 0);

            // Update inventory stock
            const newStock = ingredient.stock - usageData.quantity_used;
            const { error: updateError } = await supabase
                .from('inventory')
                .update({
                    stock: newStock,
                    last_updated: new Date().toISOString()
                })
                .eq('id', usageData.ingredient_id);

            if (updateError) throw updateError;

            // Record usage
            const { error: usageError } = await supabase
                .from('inventory_usage')
                .insert([usageData]);

            if (usageError) throw usageError;

            showToast('Stock used successfully', 'success');
            stockOutForm.reset();
            document.getElementById('order-id-section').classList.add('hidden');
            await Promise.all([fetchInventory(), fetchInventoryUsage()]);
            renderInventoryTable();
            updateDashboard();
        } catch (error) {
            console.error('Error using stock:', error);
            showToast('Error using stock', 'error');
        }
    }

    // --- Edit Item Functions ---
    function openEditModal(itemId) {
        const item = inventory.find(item => item.id === itemId);
        if (!item) return;

        document.getElementById('edit-item-id').value = item.id;
        document.getElementById('edit-item-name').value = item.name;
        document.getElementById('edit-item-unit').value = item.unit;
        document.getElementById('edit-item-stock').value = item.stock;
        document.getElementById('edit-item-min-stock').value = item.minimum_stock;
        document.getElementById('edit-item-cost').value = item.cost_per_unit || 0;
        document.getElementById('edit-item-supplier').value = item.supplier_info || '';

        editItemModal.classList.remove('hidden');
    }

    async function handleEditItem(e) {
        e.preventDefault();
        const formData = new FormData(editItemForm);
        const itemId = document.getElementById('edit-item-id').value;
        const itemData = {
            name: formData.get('name').trim(),
            stock: parseFloat(formData.get('stock')),
            unit: formData.get('unit'),
            minimum_stock: parseFloat(formData.get('minimum_stock')),
            cost_per_unit: parseFloat(formData.get('cost_per_unit')),
            supplier_info: formData.get('supplier_info')?.trim() || null,
            last_updated: new Date().toISOString()
        };

        try {
            const { error } = await supabase
                .from('inventory')
                .update(itemData)
                .eq('id', itemId);

            if (error) throw error;

            showToast('Item updated successfully', 'success');
            editItemModal.classList.add('hidden');
            await fetchInventory();
            renderInventoryTable();
            updateDashboard();
            populateIngredientDropdowns();
        } catch (error) {
            console.error('Error updating item:', error);
            showToast('Error updating item', 'error');
        }
    }

    async function deleteItem(itemId) {
        const item = inventory.find(item => item.id === itemId);
        if (!item) return;

        if (!confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            // Check if item has usage history
            const { data: usageData, error: usageError } = await supabase
                .from('inventory_usage')
                .select('id')
                .eq('ingredient_id', itemId)
                .limit(1);

            if (usageError) throw usageError;

            if (usageData && usageData.length > 0) {
                showToast('Cannot delete item with usage history', 'error');
                return;
            }

            const { error } = await supabase
                .from('inventory')
                .delete()
                .eq('id', itemId);

            if (error) throw error;

            showToast('Item deleted successfully', 'success');
            await fetchInventory();
            renderInventoryTable();
            updateDashboard();
            populateIngredientDropdowns();
        } catch (error) {
            console.error('Error deleting item:', error);
            showToast('Error deleting item', 'error');
        }
    }

    // --- Reports Functions ---
    function handleReportPeriodChange(e) {
        const customRange = document.getElementById('custom-date-range');
        if (e.target.value === 'custom') {
            customRange.classList.remove('hidden');
        } else {
            customRange.classList.add('hidden');
        }
    }

    async function generateReports() {
        try {
            const period = document.getElementById('report-period').value;
            let startDate, endDate;

            // Calculate date range based on period
            switch (period) {
                case 'today':
                    startDate = new Date();
                    endDate = new Date();
                    break;
                case 'yesterday':
                    startDate = new Date();
                    startDate.setDate(startDate.getDate() - 1);
                    endDate = new Date();
                    endDate.setDate(endDate.getDate() - 1);
                    break;
                case 'last7':
                    startDate = new Date();
                    startDate.setDate(startDate.getDate() - 7);
                    endDate = new Date();
                    break;
                case 'last30':
                    startDate = new Date();
                    startDate.setDate(startDate.getDate() - 30);
                    endDate = new Date();
                    break;
                case 'custom':
                    startDate = new Date(document.getElementById('report-start-date').value);
                    endDate = new Date(document.getElementById('report-end-date').value);
                    break;
            }

            // Fetch data for the period
            const { data: usageData, error: usageError } = await supabase
                .from('inventory_usage')
                .select('*')
                .gte('created_at', startDate.toISOString().split('T')[0])
                .lte('created_at', endDate.toISOString().split('T')[0]);

            const { data: purchaseData, error: purchaseError } = await supabase
                .from('inventory_purchases')
                .select('*')
                .gte('created_at', startDate.toISOString().split('T')[0])
                .lte('created_at', endDate.toISOString().split('T')[0]);

            if (usageError || purchaseError) throw usageError || purchaseError;

            // Calculate summary metrics
            const totalStockInQty = purchaseData.reduce((sum, purchase) => sum + purchase.quantity, 0);
            const totalStockInValue = purchaseData.reduce((sum, purchase) => sum + purchase.total_cost, 0);
            
            const totalStockOutQty = usageData.reduce((sum, usage) => sum + usage.quantity_used, 0);
            const totalStockOutValue = usageData.reduce((sum, usage) => sum + (usage.cost_incurred || 0), 0);
            
            const wastageData = usageData.filter(usage => !usage.order_id);
            const wastageQty = wastageData.reduce((sum, usage) => sum + usage.quantity_used, 0);
            const wastageValue = wastageData.reduce((sum, usage) => sum + (usage.cost_incurred || 0), 0);
            
            const cogs = usageData.filter(usage => usage.order_id)
                .reduce((sum, usage) => sum + (usage.cost_incurred || 0), 0);

            // Update summary cards
            document.getElementById('report-stock-in-qty').textContent = totalStockInQty.toFixed(2);
            document.getElementById('report-stock-in-value').textContent = `₹${totalStockInValue.toFixed(2)}`;
            document.getElementById('report-stock-out-qty').textContent = totalStockOutQty.toFixed(2);
            document.getElementById('report-stock-out-value').textContent = `₹${totalStockOutValue.toFixed(2)}`;
            document.getElementById('report-wastage-qty').textContent = wastageQty.toFixed(2);
            document.getElementById('report-wastage-value').textContent = `₹${wastageValue.toFixed(2)}`;
            document.getElementById('report-cogs').textContent = `₹${cogs.toFixed(2)}`;

            // Generate item-wise usage summary
            renderItemUsageSummary(usageData, purchaseData);
            renderWastageBreakdown(wastageData);

        } catch (error) {
            console.error('Error generating reports:', error);
            showToast('Error generating reports', 'error');
        }
    }

    function renderItemUsageSummary(usageData, purchaseData) {
        const itemUsageBody = document.getElementById('item-usage-body');
        const itemUsage = {};

        // Aggregate usage data by ingredient
        usageData.forEach(usage => {
            const ingredient = inventory.find(item => item.id === usage.ingredient_id);
            if (ingredient) {
                if (!itemUsage[ingredient.name]) {
                    itemUsage[ingredient.name] = {
                        stockIn: 0,
                        stockOut: 0,
                        wastage: 0,
                        cost: 0
                    };
                }
                itemUsage[ingredient.name].stockOut += usage.quantity_used;
                itemUsage[ingredient.name].cost += usage.cost_incurred || 0;
                
                if (!usage.order_id) {
                    itemUsage[ingredient.name].wastage += usage.quantity_used;
                }
            }
        });

        // Aggregate purchase data by ingredient
        purchaseData.forEach(purchase => {
            const ingredient = inventory.find(item => item.id === purchase.ingredient_id);
            if (ingredient && itemUsage[ingredient.name]) {
                itemUsage[ingredient.name].stockIn += purchase.quantity;
            }
        });

        if (Object.keys(itemUsage).length === 0) {
            itemUsageBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                        No usage data for the selected period
                    </td>
                </tr>
            `;
            return;
        }

        itemUsageBody.innerHTML = Object.entries(itemUsage).map(([itemName, data]) => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${itemName}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${data.stockIn.toFixed(2)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${data.stockOut.toFixed(2)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${data.wastage.toFixed(2)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ₹${data.cost.toFixed(2)}
                </td>
            </tr>
        `).join('');
    }

    function renderWastageBreakdown(wastageData) {
        const wastageBody = document.getElementById('wastage-breakdown-body');
        
        if (wastageData.length === 0) {
            wastageBody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                        No wastage data for the selected period
                    </td>
                </tr>
            `;
            return;
        }

        wastageBody.innerHTML = wastageData.map(usage => {
            const ingredient = inventory.find(item => item.id === usage.ingredient_id);
            return `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${ingredient ? ingredient.name : 'Unknown Item'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${usage.quantity_used.toFixed(2)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹${(usage.cost_incurred || 0).toFixed(2)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${formatDate(usage.created_at)}
                    </td>
                </tr>
            `;
        }).join('');
    }

    function exportToCSV() {
        // Simple CSV export implementation
        const period = document.getElementById('report-period').value;
        const date = new Date().toISOString().split('T')[0];
        const filename = `inventory_report_${period}_${date}.csv`;
        
        // Create CSV content (basic implementation)
        let csvContent = "Item,Stock In,Stock Out,Wastage,Cost\\n";
        
        const rows = document.querySelectorAll('#item-usage-body tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 5) {
                const rowData = [
                    cells[0].textContent,
                    cells[1].textContent,
                    cells[2].textContent,
                    cells[3].textContent,
                    cells[4].textContent.replace('₹', '')
                ];
                csvContent += rowData.join(',') + '\\n';
            }
        });

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showToast('CSV exported successfully', 'success');
    }

    // --- Utility Functions ---
    function populateIngredientDropdowns() {
        const purchaseSelect = document.getElementById('purchase-ingredient');
        const usageSelect = document.getElementById('usage-ingredient');

        const options = inventory.map(item => 
            `<option value="${item.id}">${item.name} (${item.stock} ${item.unit})</option>`
        ).join('');

        purchaseSelect.innerHTML = '<option value="">Select Ingredient</option>' + options;
        usageSelect.innerHTML = '<option value="">Select Ingredient</option>' + options;
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN') + ' ' + date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function showToast(message, type = 'info') {
        toastMessage.textContent = message;
        toast.classList.remove('translate-x-full');
        
        setTimeout(() => {
            toast.classList.add('translate-x-full');
        }, 3000);
    }
});
