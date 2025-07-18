import { createSignal, createEffect, onMount, For } from 'solid-js';

interface User {
  id: string;
  prename: string;
  surname: string;
  email: string;
  phone?: string;
  profilePicture?: string;
}

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

export default function ProfilePage() {
  const [user, setUser] = createSignal<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = createSignal(false);
  const [userListings, setUserListings] = createSignal<Item[]>([]);
  const [categories, setCategories] = createSignal<Record<string, string>>({});
  const [locations, setLocations] = createSignal<Record<string, string>>({});
  const [categoriesList, setCategoriesList] = createSignal<Category[]>([]);
  const [locationsList, setLocationsList] = createSignal<Location[]>([]);
  const [showEditModal, setShowEditModal] = createSignal(false);
  const [showItemEditModal, setShowItemEditModal] = createSignal(false);
  const [selectedItem, setSelectedItem] = createSignal<Item | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [listingsLoading, setListingsLoading] = createSignal(true);
  const [editMessage, setEditMessage] = createSignal('');
  const [editMessageType, setEditMessageType] = createSignal<'success' | 'error'>('success');
  const [failedImages, setFailedImages] = createSignal<Set<string>>(new Set());

  // Form signals
  const [editPrename, setEditPrename] = createSignal('');
  const [editSurname, setEditSurname] = createSignal('');
  const [editPhone, setEditPhone] = createSignal('');

  // Item edit form signals
  const [editItemTitle, setEditItemTitle] = createSignal('');
  const [editItemDescription, setEditItemDescription] = createSignal('');
  const [editItemType, setEditItemType] = createSignal<'isLost' | 'isFound'>('isLost');
  const [editItemCategory, setEditItemCategory] = createSignal('');
  const [editItemLocation, setEditItemLocation] = createSignal('');
  const [editItemDate, setEditItemDate] = createSignal('');
  const [editItemImage, setEditItemImage] = createSignal<File | null>(null);
  const [editItemImagePreview, setEditItemImagePreview] = createSignal('');

  let profilePictureInput: HTMLInputElement;
  let itemImageInput: HTMLInputElement;

  onMount(() => {
    checkLoginStatus();
  });

  const checkLoginStatus = async () => {
    const localUser = localStorage.getItem('user');
    if (localUser) {
      const userData = JSON.parse(localUser);
      setUser(userData);
      setIsLoggedIn(true);
      await loadUserProfile();
      await loadUserListings();
    }
  };

  const loadUserProfile = async () => {
    const currentUser = user();
    if (!currentUser) return;

    try {
      const response = await fetch(`/api/userdb?id=${currentUser.id}`);
      const result = await response.json();
      
      if (result.success === 'ok' && result.user) {
        setUser(result.user);
        setEditPrename(result.user.prename || '');
        setEditSurname(result.user.surname || '');
        setEditPhone(result.user.phone || '');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadUserListings = async () => {
    const currentUser = user();
    if (!currentUser) return;

    setListingsLoading(true);
    try {
      await Promise.all([loadCategories(), loadLocations()]);
      
      const response = await fetch(`/api/items?userId=${currentUser.id}`);
      const result = await response.json();
      
      if (result.success === 'ok' && result.items) {
        const userItems = result.items.filter((item: Item) => item.userId === currentUser.id);
        setUserListings(userItems);
      }
    } catch (error) {
      console.error('Error loading user listings:', error);
    } finally {
      setListingsLoading(false);
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

  const handleProfilePictureChange = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Datei ist zu groß. Maximale Größe: 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Bitte wählen Sie eine gültige Bilddatei.');
      return;
    }

    const formData = new FormData();
    formData.append('profilePicture', file);
    formData.append('userId', user()?.id || '');

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success === 'ok') {
        setUser(prev => prev ? { ...prev, profilePicture: result.profilePictureUrl } : null);
        
        const currentUser = user();
        if (currentUser) {
          const updatedUser = { ...currentUser, profilePicture: result.profilePictureUrl };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      } else {
        alert('Fehler beim Hochladen des Profilbildes: ' + result.message);
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Fehler beim Hochladen des Profilbildes.');
    }
  };

  const openEditModal = () => {
    const currentUser = user();
    if (currentUser) {
      setEditPrename(currentUser.prename || '');
      setEditSurname(currentUser.surname || '');
      setEditPhone(currentUser.phone || '');
    }
    setShowEditModal(true);
    setEditMessage('');
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditMessage('');
  };

  const handleProfileUpdate = async (event: Event) => {
    event.preventDefault();
    setLoading(true);

    const data = {
      userId: user()?.id,
      prename: editPrename(),
      surname: editSurname(),
      phone: editPhone()
    };

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success === 'ok') {
        setEditMessage('Profil erfolgreich aktualisiert!');
        setEditMessageType('success');

        setUser(prev => prev ? {
          ...prev,
          prename: data.prename,
          surname: data.surname,
          phone: data.phone
        } : null);

        const currentUser = user();
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            prename: data.prename,
            surname: data.surname,
            phone: data.phone
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }

        setTimeout(() => {
          closeEditModal();
        }, 1500);
      } else {
        setEditMessage('Fehler beim Aktualisieren: ' + result.message);
        setEditMessageType('error');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setEditMessage('Netzwerkfehler beim Aktualisieren des Profils.');
      setEditMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Handle image load errors
  const handleImageError = (e: Event, originalSrc: string) => {
    const img = e.target as HTMLImageElement;
    const failed = failedImages();
    
    if (!failed.has(originalSrc) && img.src !== '/uploads/placeholder.svg') {
      setFailedImages(new Set([...failed, originalSrc]));
      img.src = '/uploads/placeholder.svg';
    }
  };

  const getImageSrc = (item: Item) => {
    const failed = failedImages();
    if (!item.img || failed.has(item.img)) {
      return '/uploads/placeholder.svg';
    }
    return item.img;
  };

  const openItemEditModal = (item: Item) => {
    setSelectedItem(item);
    setEditItemTitle(item.title);
    setEditItemDescription(item.description || '');
    setEditItemType(item.type);
    setEditItemCategory(item.categoryId);
    setEditItemLocation(item.locationId);
    setEditItemDate(item.date ? new Date(item.date * 1000).toISOString().split('T')[0] : '');
    setEditItemImage(null);
    setEditItemImagePreview('');
    setShowItemEditModal(true);
    document.body.style.overflow = 'hidden';
  };

  const closeItemEditModal = () => {
    setShowItemEditModal(false);
    setSelectedItem(null);
    setEditItemImage(null);
    setEditItemImagePreview('');
    if (itemImageInput) {
      itemImageInput.value = '';
    }
    document.body.style.overflow = 'auto';
  };

  const handleItemImageChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Datei ist zu groß. Maximale Größe: 5MB');
        target.value = '';
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Bitte wählen Sie eine gültige Bilddatei.');
        target.value = '';
        return;
      }

      setEditItemImage(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditItemImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setEditItemImage(null);
      setEditItemImagePreview('');
    }
  };

  const removeItemImage = () => {
    setEditItemImage(null);
    setEditItemImagePreview('');
    if (itemImageInput) {
      itemImageInput.value = '';
    }
  };

    const handleItemUpdate = async (event: Event) => {
    event.preventDefault();
    setLoading(true);

    const currentItem = selectedItem();
    if (!currentItem) return;

    try {
      let response;
      
      if (editItemImage()) {
        // Use FormData for image updates
        const formData = new FormData();
        formData.append('id', currentItem.id);
        formData.append('name', editItemTitle());
        formData.append('title', editItemTitle());
        formData.append('description', editItemDescription());
        formData.append('type', editItemType());
        formData.append('categoryId', editItemCategory());
        formData.append('locationId', editItemLocation());
        formData.append('date', editItemDate() ? new Date(editItemDate()).toISOString() : '');
        formData.append('userId', currentItem.userId);
        formData.append('reportedAt', currentItem.reportedAt.toString());
        formData.append('img', editItemImage()!);

        response = await fetch('/api/items', {
          method: 'PUT',
          body: formData
        });
      } else {
        // Update without image changes - use JSON
        const updateData = {
          id: currentItem.id,
          name: editItemTitle(),
          title: editItemTitle(),
          description: editItemDescription(),
          type: editItemType(),
          categoryId: editItemCategory(),
          locationId: editItemLocation(),
          date: editItemDate() ? new Date(editItemDate()).getTime() / 1000 : currentItem.date,
          img: currentItem.img, // Keep existing image
          userId: currentItem.userId,
          reportedAt: currentItem.reportedAt
        };

        response = await fetch('/api/items', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData)
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success === 'ok') {
        await loadUserListings();
        closeItemEditModal();
        setEditMessage('Gegenstand erfolgreich aktualisiert!');
        setEditMessageType('success');
      } else {
        setEditMessage('Fehler beim Aktualisieren des Gegenstands: ' + result.message);
        setEditMessageType('error');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      setEditMessage('Fehler beim Aktualisieren des Gegenstands: ' + error.message);
      setEditMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleItemDelete = async () => {
    if (!confirm('Sind Sie sicher, dass Sie diesen Gegenstand löschen möchten?')) {
      return;
    }

    const itemId = selectedItem()?.id;
    if (!itemId) {
      alert('Fehler: Gegenstand ID nicht gefunden.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/items?id=${itemId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success === 'ok' || (result.itemObject && result.itemObject.success === 'ok')) {
        // Remove the item from the list
        setUserListings(prev => prev.filter(item => item.id !== itemId));
        closeItemEditModal();
      } else {
        alert('Fehler beim Löschen des Gegenstands: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Fehler beim Löschen des Gegenstands.');
    } finally {
      setLoading(false);
    }
  };

  const createItemCard = (item: Item) => {
    const categoryName = categories()[item.categoryId] || 'Unbekannt';
    const locationName = locations()[item.locationId] || 'Unbekannt';
    const date = item.date ? new Date(item.date * 1000).toLocaleDateString('de-DE') : 'Unbekannt';
    const typeLabel = item.type === 'isLost' ? 'Verloren' : 'Gefunden';
    const typeBadgeClass = item.type === 'isLost' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
    const imageSrc = getImageSrc(item);

    return (
      <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition duration-300">
        <div class="h-48 bg-gray-100 overflow-hidden">
          <img 
            src={imageSrc} 
            alt={item.title} 
            class="w-full h-full object-contain"
            onError={(e) => handleImageError(e, item.img || '')}
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
            onClick={() => openItemEditModal(item)}
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300"
          >
            Bearbeiten
          </button>
        </div>
      </div>
    );
  };

  return (
    <div class="mx-auto max-w-screen-lg px-4 py-8">
      {!isLoggedIn() ? (
        <div class="text-center">
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 class="text-2xl font-bold text-yellow-800 mb-4">Anmeldung erforderlich</h2>
            <p class="text-yellow-700 mb-4">Sie müssen sich anmelden, um Ihr Profil zu sehen.</p>
            <a href="/login/" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Zur Anmeldung
            </a>
          </div>
        </div>
      ) : (
        <div>
          {/* Profile Header */}
          <div class="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div class="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-8">
              {/* Profile Picture */}
              <div class="flex-shrink-0">
                <div class="relative">
                  <img 
                    src={user()?.profilePicture || "/uploads/default-avatar.svg"} 
                    alt="Profilbild" 
                    class="w-40 h-40 rounded-full object-cover border-4 border-blue-200"
                  />
                  <button 
                    onClick={() => profilePictureInput.click()}
                    class="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition"
                  >
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                </div>
                <input 
                  type="file" 
                  ref={profilePictureInput!} 
                  accept="image/*" 
                  class="hidden"
                  onChange={handleProfilePictureChange}
                />
              </div>

              {/* Profile Info with Icons */}
              <div class="flex-grow">
                <h1 class="text-4xl font-bold text-gray-800 mb-4">
                  {user()?.prename} {user()?.surname}
                </h1>
                <div class="space-y-2">
                  <div class="flex items-center text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    <span class="text-lg">{user()?.email}</span>
                  </div>
                  <div class="flex items-center text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span class="text-lg">{user()?.phone || 'Nicht angegeben'}</span>
                  </div>
                </div>
              </div>

              {/* Edit Profile Button */}
              <button 
                onClick={openEditModal}
                class="flex items-center space-x-2 bg-white hover:bg-gray-50 text-blue-600 font-semibold py-3 px-6 border-2 border-blue-600 rounded-lg transition duration-300"
              >
                <span class="material-symbols-outlined">edit</span>
                <span>Profil bearbeiten</span>
              </button>
            </div>
          </div>

          {/* User's Listings */}
          <div class="bg-white rounded-lg shadow-lg p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">Meine Meldungen</h2>
            
            {listingsLoading() ? (
              <div class="text-center py-8">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p class="mt-2 text-gray-600">Lade Meldungen...</p>
              </div>
            ) : userListings().length === 0 ? (
              <div class="text-center py-12">
                <div class="text-gray-500 text-lg">Sie haben noch keine Gegenstände gemeldet.</div>
                <p class="text-gray-400 mt-2">
                  <a href="/report/" class="text-blue-600 hover:underline">
                    Klicken Sie hier, um einen Gegenstand zu melden
                  </a>
                </p>
              </div>
            ) : (
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userListings().map(item => createItemCard(item))}
              </div>
            )}
          </div>

          {/* Edit Profile Modal */}
          {showEditModal() && (
            <div class="fixed inset-0 z-50">
              <div class="absolute inset-0 backdrop-blur-sm bg-transparent"></div>
              
              <div class="relative flex items-center justify-center min-h-screen p-4">
                <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
                  <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                      <h3 class="text-xl font-bold text-gray-800">Profil bearbeiten</h3>
                      <button 
                        onClick={closeEditModal}
                        class="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                      >
                        ×
                      </button>
                    </div>

                    <form onSubmit={handleProfileUpdate} class="space-y-4">
                      <div>
                        <label for="editPrename" class="block text-sm font-medium text-gray-700 mb-1">
                          Vorname
                        </label>
                        <input 
                          type="text" 
                          id="editPrename" 
                          value={editPrename()}
                          onInput={(e) => setEditPrename(e.currentTarget.value)}
                          required 
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label for="editSurname" class="block text-sm font-medium text-gray-700 mb-1">
                          Nachname
                        </label>
                        <input 
                          type="text" 
                          id="editSurname" 
                          value={editSurname()}
                          onInput={(e) => setEditSurname(e.currentTarget.value)}
                          required 
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label for="editPhone" class="block text-sm font-medium text-gray-700 mb-1">
                          Telefonnummer
                        </label>
                        <input 
                          type="tel" 
                          id="editPhone" 
                          value={editPhone()}
                          onInput={(e) => setEditPhone(e.currentTarget.value)}
                          required 
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      {editMessage() && (
                        <div class="text-center">
                          <p class={`text-sm ${editMessageType() === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {editMessage()}
                          </p>
                        </div>
                      )}

                      <div class="flex space-x-4">
                        <button 
                          type="button" 
                          onClick={closeEditModal}
                          class="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                        >
                          Abbrechen
                        </button>
                        <button 
                          type="submit" 
                          disabled={loading()}
                          class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:opacity-50"
                        >
                          {loading() ? 'Speichern...' : 'Speichern'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Item Edit Modal */}
          {showItemEditModal() && selectedItem() && (
            <div class="fixed inset-0 z-50">
              <div class="absolute inset-0 backdrop-blur-sm bg-transparent"></div>
              
              <div class="relative flex items-center justify-center min-h-screen p-4">
                <div class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-90vh overflow-y-auto">
                  <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                      <h3 class="text-xl font-bold text-gray-800">Gegenstand bearbeiten</h3>
                      <button 
                        onClick={closeItemEditModal}
                        class="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                      >
                        ×
                      </button>
                    </div>

                    <form onSubmit={handleItemUpdate} class="space-y-4">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Typ</label>
                        <div class="flex space-x-4">
                          <label class="inline-flex items-center">
                            <input 
                              type="radio" 
                              value="isLost" 
                              checked={editItemType() === 'isLost'}
                              onChange={(e) => setEditItemType(e.currentTarget.value as 'isLost')}
                              class="form-radio text-blue-600"
                            />
                            <span class="ml-2">Verloren</span>
                          </label>
                          <label class="inline-flex items-center">
                            <input 
                              type="radio" 
                              value="isFound" 
                              checked={editItemType() === 'isFound'}
                              onChange={(e) => setEditItemType(e.currentTarget.value as 'isFound')}
                              class="form-radio text-blue-600"
                            />
                            <span class="ml-2">Gefunden</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                        <input 
                          type="text" 
                          value={editItemTitle()}
                          onInput={(e) => setEditItemTitle(e.currentTarget.value)}
                          required 
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                        <select 
                          value={editItemCategory()}
                          onChange={(e) => setEditItemCategory(e.currentTarget.value)}
                          required 
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Wählen Sie eine Kategorie</option>
                          <For each={categoriesList()}>
                            {(category) => (
                              <option value={category.id}>{category.name}</option>
                            )}
                          </For>
                        </select>
                      </div>

                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Ort</label>
                        <select 
                          value={editItemLocation()}
                          onChange={(e) => setEditItemLocation(e.currentTarget.value)}
                          required 
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Wählen Sie einen Ort</option>
                          <For each={locationsList()}>
                            {(location) => (
                              <option value={location.id}>{location.name}</option>
                            )}
                          </For>
                        </select>
                      </div>

                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                        <textarea 
                          value={editItemDescription()}
                          onInput={(e) => setEditItemDescription(e.currentTarget.value)}
                          rows="3"
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                        <input 
                          type="date" 
                          value={editItemDate()}
                          onInput={(e) => setEditItemDate(e.currentTarget.value)}
                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Aktuelles Bild</label>
                        <div class="space-y-4">
                          {selectedItem()?.img && (
                            <div class="text-sm text-gray-600">
                              <img 
                                src={getImageSrc(selectedItem()!)} 
                                alt="Aktuelles Bild" 
                                class="max-w-xs max-h-32 rounded-lg shadow-md object-contain"
                              />
                            </div>
                          )}
                          
                          <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Neues Bild (optional)</label>
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={handleItemImageChange}
                              ref={itemImageInput!}
                              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                            {editItemImagePreview() && (
                              <div class="mt-2 relative">
                                <img 
                                  src={editItemImagePreview()} 
                                  alt="Vorschau" 
                                  class="max-w-xs max-h-32 rounded-lg shadow-md object-contain"
                                />
                                <button 
                                  type="button" 
                                  onClick={removeItemImage}
                                  class="absolute top-1 right-1 bg-red-500 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold"
                                >
                                  ×
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div class="flex space-x-4">
                        <button 
                          type="button" 
                          onClick={closeItemEditModal}
                          class="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                        >
                          Abbrechen
                        </button>
                        <button 
                          type="button" 
                          onClick={handleItemDelete}
                          disabled={loading()}
                          class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:opacity-50"
                        >
                          Löschen
                        </button>
                        <button 
                          type="submit" 
                          disabled={loading()}
                          class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:opacity-50"
                        >
                          {loading() ? 'Speichern...' : 'Speichern'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}
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