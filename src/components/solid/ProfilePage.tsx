import { createSignal, createEffect, onMount } from 'solid-js';

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
  type: 'isLost' | 'isFound';
  categoryId: string;
  locationId: string;
  date: number;
  img?: string;
  userId: string;
}

export default function ProfilePage() {
  const [user, setUser] = createSignal<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = createSignal(false);
  const [userListings, setUserListings] = createSignal<Item[]>([]);
  const [categories, setCategories] = createSignal<Record<string, string>>({});
  const [locations, setLocations] = createSignal<Record<string, string>>({});
  const [showEditModal, setShowEditModal] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [listingsLoading, setListingsLoading] = createSignal(true);
  const [editMessage, setEditMessage] = createSignal('');
  const [editMessageType, setEditMessageType] = createSignal<'success' | 'error'>('success');

  // Form signals
  const [editPrename, setEditPrename] = createSignal('');
  const [editSurname, setEditSurname] = createSignal('');
  const [editPhone, setEditPhone] = createSignal('');

  let profilePictureInput: HTMLInputElement;

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
        // Update form fields
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
        result.categories.forEach((cat: any) => {
          cats[cat.id] = cat.name;
        });
        setCategories(cats);
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
        result.locations.forEach((loc: any) => {
          locs[loc.id] = loc.name;
        });
        setLocations(locs);
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
        // Update user state
        setUser(prev => prev ? { ...prev, profilePicture: result.profilePictureUrl } : null);
        
        // Update localStorage
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

        // Update user state
        setUser(prev => prev ? {
          ...prev,
          prename: data.prename,
          surname: data.surname,
          phone: data.phone
        } : null);

        // Update localStorage
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

  const createItemCard = (item: Item) => {
    const categoryName = categories()[item.categoryId] || 'Unbekannt';
    const locationName = locations()[item.locationId] || 'Unbekannt';
    const date = item.date ? new Date(item.date * 1000).toLocaleDateString('de-DE') : 'Unbekannt';
    const typeLabel = item.type === 'isLost' ? 'Verloren' : 'Gefunden';
    const typeBadgeClass = item.type === 'isLost' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
    const imageSrc = item.img || '/uploads/placeholder.svg';

    return (
      <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition duration-300">
        <div class="h-48 bg-gray-100 overflow-hidden">
          <img 
            src={imageSrc} 
            alt={item.title} 
            class="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/uploads/placeholder.svg';
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
          
          <a 
            href={`/items/${item.id}`} 
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300 inline-block text-center"
          >
            Details anzeigen
          </a>
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
                    class="w-32 h-32 rounded-full object-cover border-4 border-blue-200"
                  />
                  <button 
                    onClick={() => profilePictureInput.click()}
                    class="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
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

              {/* Profile Info */}
              <div class="flex-grow text-center md:text-left">
                <h1 class="text-3xl font-bold text-gray-800 mb-2">
                  {user()?.prename} {user()?.surname}
                </h1>
                <p class="text-gray-600 mb-2">{user()?.email}</p>
                <p class="text-gray-600 mb-4">{user()?.phone || 'Nicht angegeben'}</p>
                
                <button 
                  onClick={openEditModal}
                  class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300"
                >
                  Profil bearbeiten
                </button>
              </div>
            </div>
          </div>

          {/* User's Listings */}
          <div class="bg-white rounded-lg shadow-lg p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">Meine Meldungen</h2>
            
            {listingsLoading() ? (
              <div class="text-center py-8">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p class="mt-2 text-gray-600">Lade Ihre Meldungen...</p>
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
        `}
      </style>
    </div>
  );
}