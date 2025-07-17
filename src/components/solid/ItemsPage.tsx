import { createSignal, createEffect, onMount, For } from 'solid-js';

interface Item {
  id: string;
  title: string;
  description?: string;
  type: 'isLost' | 'isFound';
  categoryId: string;
  locationId: string;
  date: number;
  img?: string;
  userId: string;
  reportedAt: number;
}

interface Category {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  prename: string;
  surname: string;
}

export default function ItemsPage() {
  const [allItems, setAllItems] = createSignal<Item[]>([]);
  const [filteredItems, setFilteredItems] = createSignal<Item[]>([]);
  const [categories, setCategories] = createSignal<Record<string, string>>({});
  const [locations, setLocations] = createSignal<Record<string, string>>({});
  const [categoriesList, setCategoriesList] = createSignal<Category[]>([]);
  const [locationsList, setLocationsList] = createSignal<Location[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [showModal, setShowModal] = createSignal(false);
  const [selectedItem, setSelectedItem] = createSignal<Item | null>(null);
  const [selectedItemUser, setSelectedItemUser] = createSignal<User | null>(null);

  // Filter signals
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedCategory, setSelectedCategory] = createSignal('');
  const [selectedLocation, setSelectedLocation] = createSignal('');
  const [selectedDate, setSelectedDate] = createSignal('');
  const [selectedType, setSelectedType] = createSignal('');

  onMount(() => {
    loadData();
  });

  // Auto-apply filters when any filter value changes
  createEffect(() => {
    const search = searchTerm();
    const category = selectedCategory();
    const location = selectedLocation();
    const date = selectedDate();
    const type = selectedType();

    const filtered = allItems().filter(item => {
      // Search filter
      if (search && !item.title.toLowerCase().includes(search.toLowerCase()) && 
          !(item.description && item.description.toLowerCase().includes(search.toLowerCase()))) {
        return false;
      }

      // Category filter
      if (category && item.categoryId !== category) {
        return false;
      }

      // Location filter
      if (location && item.locationId !== location) {
        return false;
      }

      // Date filter
      if (date && item.date) {
        const itemDate = new Date(item.date * 1000).toISOString().split('T')[0];
        if (itemDate !== date) {
          return false;
        }
      }

      // Type filter
      if (type && item.type !== type) {
        return false;
      }

      return true;
    });

    setFilteredItems(filtered);
  });

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadItems(),
        loadCategories(),
        loadLocations()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      const response = await fetch('/api/items');
      const result = await response.json();
      
      if (result.success === 'ok') {
        setAllItems(result.items);
        setFilteredItems(result.items);
      } else {
        console.error('Error loading items:', result.message);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categorydb');
      const result = await response.json();
      
      if (result.success === 'ok') {
        const cats: Record<string, string> = {};
        result.categories.forEach((cat: Category) => {
          cats[cat.id] = cat.name;
        });
        setCategories(cats);
        setCategoriesList(result.categories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      const result = await response.json();
      
      if (result.success === 'ok') {
        const locs: Record<string, string> = {};
        result.locations.forEach((loc: Location) => {
          locs[loc.id] = loc.name;
        });
        setLocations(locs);
        setLocationsList(result.locations);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const handleItemClick = async (item: Item) => {
    // Check authentication
    const user = localStorage.getItem('user');
    if (!user) {
      window.location.href = '/login/';
      return;
    }

    // Load user data for the item
    if (item.userId) {
      try {
        const userResponse = await fetch(`/api/userdb?id=${item.userId}`);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.success === 'ok' && userData.user) {
            setSelectedItemUser(userData.user);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    }

    setSelectedItem(item);
    setShowModal(true);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
    setSelectedItemUser(null);
    document.body.style.overflow = 'auto';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedLocation('');
    setSelectedDate('');
    setSelectedType('');
  };

  const createItemCard = (item: Item) => {
    const categoryName = categories()[item.categoryId] || 'Unbekannt';
    const locationName = locations()[item.locationId] || 'Unbekannt';
    const date = item.date ? new Date(item.date * 1000).toLocaleDateString('de-DE') : 'Unbekannt';
    const typeLabel = item.type === 'isLost' ? 'Verloren' : 'Gefunden';
    const typeBadgeClass = item.type === 'isLost' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
    const imageSrc = item.img || '/uploads/placeholder.jpg';

    return (
      <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition duration-300">
        <div class="h-48 bg-gray-100 overflow-hidden">
          <img 
            src={imageSrc} 
            alt={item.title} 
            class="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/uploads/placeholder.jpg';
            }}
          />
        </div>
        
        <div class="p-4">
          <span class={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${typeBadgeClass} mb-2`}>
            {typeLabel}
          </span>
          
          <h3 class="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">{item.title}</h3>
          
          <div class="space-y-1 text-sm text-gray-600 mb-4">
            <p><strong>Kategorie:</strong> {categoryName}</p>
            <p><strong>Ort:</strong> {locationName}</p>
            <p><strong>Datum:</strong> {date}</p>
          </div>
          
          <button 
            onClick={() => handleItemClick(item)}
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300"
          >
            Item anschauen
          </button>
        </div>
      </div>
    );
  };

  return (
    <div class="mx-auto max-w-screen-xl px-4 py-8">
      <h1 class="text-4xl font-bold text-gray-800 mb-8 text-center">
        Verlorene und gefundene Gegenstände
      </h1>
      
      {/* Filter Section */}
      <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search Input */}
          <div class="lg:col-span-1">
            <label for="search" class="block text-sm font-medium text-gray-700 mb-2">Suche</label>
            <input 
              type="text" 
              id="search" 
              placeholder="Nach Gegenstand suchen..."
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.currentTarget.value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category Dropdown */}
          <div class="lg:col-span-1">
            <label for="categoryFilter" class="block text-sm font-medium text-gray-700 mb-2">Kategorie</label>
            <select 
              id="categoryFilter"
              value={selectedCategory()}
              onChange={(e) => setSelectedCategory(e.currentTarget.value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Alle Kategorien</option>
              <For each={categoriesList()}>
                {(category) => (
                  <option value={category.id}>{category.name}</option>
                )}
              </For>
            </select>
          </div>

          {/* Location Dropdown */}
          <div class="lg:col-span-1">
            <label for="locationFilter" class="block text-sm font-medium text-gray-700 mb-2">Ort</label>
            <select 
              id="locationFilter"
              value={selectedLocation()}
              onChange={(e) => setSelectedLocation(e.currentTarget.value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Alle Orte</option>
              <For each={locationsList()}>
                {(location) => (
                  <option value={location.id}>{location.name}</option>
                )}
              </For>
            </select>
          </div>

          {/* Date Input */}
          <div class="lg:col-span-1">
            <label for="dateFilter" class="block text-sm font-medium text-gray-700 mb-2">Datum</label>
            <input 
              type="date" 
              id="dateFilter"
              value={selectedDate()}
              onInput={(e) => setSelectedDate(e.currentTarget.value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Type Switch */}
          <div class="lg:col-span-1">
            <label class="block text-sm font-medium text-gray-700 mb-2">Typ</label>
            <div class="flex items-center space-x-4">
              <label class="inline-flex items-center">
                <input 
                  type="radio" 
                  name="typeFilter" 
                  value="" 
                  checked={selectedType() === ''}
                  onChange={(e) => setSelectedType(e.currentTarget.value)}
                  class="form-radio text-blue-600"
                />
                <span class="ml-2 text-sm">Alle</span>
              </label>
              <label class="inline-flex items-center">
                <input 
                  type="radio" 
                  name="typeFilter" 
                  value="isLost" 
                  checked={selectedType() === 'isLost'}
                  onChange={(e) => setSelectedType(e.currentTarget.value)}
                  class="form-radio text-blue-600"
                />
                <span class="ml-2 text-sm">Verloren</span>
              </label>
              <label class="inline-flex items-center">
                <input 
                  type="radio" 
                  name="typeFilter" 
                  value="isFound" 
                  checked={selectedType() === 'isFound'}
                  onChange={(e) => setSelectedType(e.currentTarget.value)}
                  class="form-radio text-blue-600"
                />
                <span class="ml-2 text-sm">Gefunden</span>
              </label>
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div class="mt-4 text-center">
          <button 
            onClick={clearFilters}
            class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition duration-300"
          >
            Filter zurücksetzen
          </button>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading() && (
        <div class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p class="mt-2 text-gray-600">Lade Gegenstände...</p>
        </div>
      )}

      {/* Items Grid */}
      {!loading() && (
        <>
          {filteredItems().length === 0 ? (
            <div class="text-center py-12">
              <div class="text-gray-500 text-lg">Keine Gegenstände gefunden.</div>
              <p class="text-gray-400 mt-2">Versuchen Sie andere Suchkriterien.</p>
            </div>
          ) : (
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <For each={filteredItems()}>
                {(item) => createItemCard(item)}
              </For>
            </div>
          )}
        </>
      )}

      {/* Modal for Item Detail View */}
      {showModal() && selectedItem() && (
        <div class="fixed inset-0 z-50">
          <div class="absolute inset-0 backdrop-blur-sm bg-transparent"></div>
          
          <div class="relative flex items-center justify-center min-h-screen p-4">
            <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-90vh overflow-y-auto">
              <div class="p-6">
                {/* Modal Header */}
                <div class="flex justify-between items-start mb-6">
                  <h2 class="text-2xl font-bold text-gray-800">{selectedItem()?.title}</h2>
                  <button 
                    onClick={closeModal}
                    class="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
                  >
                    ×
                  </button>
                </div>

                {/* Modal Content */}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Image Section */}
                  <div class="space-y-4">
                    <div class="w-full h-80 bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={selectedItem()?.img || '/uploads/placeholder.svg'} 
                        alt={selectedItem()?.title || ''} 
                        class="w-full h-full object-contain rounded-lg shadow-md"
                      />
                    </div>
                    
                    {/* Item Details */}
                    <div class="space-y-2">
                      <div class="flex items-center space-x-2">
                        <span class={`px-3 py-1 rounded-full text-sm font-medium ${
                          selectedItem()?.type === 'isLost' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {selectedItem()?.type === 'isLost' ? 'Verloren' : 'Gefunden'}
                        </span>
                      </div>
                      <div class="text-sm text-gray-600">
                        <strong>Kategorie:</strong> {categories()[selectedItem()?.categoryId || ''] || 'Unbekannt'}
                      </div>
                      <div class="text-sm text-gray-600">
                        <strong>Ort:</strong> {locations()[selectedItem()?.locationId || ''] || 'Unbekannt'}
                      </div>
                      <div class="text-sm text-gray-600">
                        <strong>Datum:</strong> {selectedItem()?.date ? new Date(selectedItem()!.date * 1000).toLocaleDateString('de-DE') : 'Unbekannt'}
                      </div>
                    </div>
                  </div>

                  {/* Details Section */}
                  <div class="space-y-4">
                    {/* Description */}
                    <div>
                      <h3 class="text-lg font-semibold text-gray-800 mb-2">Beschreibung</h3>
                      <p class="text-gray-600 leading-relaxed">
                        {selectedItem()?.description || 'Keine Beschreibung verfügbar.'}
                      </p>
                    </div>

                    {/* Contact Info */}
                    <div>
                      <h3 class="text-lg font-semibold text-gray-800 mb-2">Kontakt</h3>
                      <p class="text-gray-600">
                        Gemeldet von: <span class="font-medium">
                          {selectedItemUser()?.email || `Unbekannt (${selectedItem()?.userId})`}
                        </span>
                      </p>
                      <p class="text-gray-600">
                        Gemeldet am: <span class="font-medium">
                          {selectedItem()?.reportedAt ? new Date(selectedItem()!.reportedAt * 1000).toLocaleDateString('de-DE') : 'Unbekannt'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .max-h-90vh {
            max-height: 90vh;
          }
        `}
      </style>
    </div>
  );
}